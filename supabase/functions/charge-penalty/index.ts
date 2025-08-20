import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-PENALTY] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { bookingId, amount, description, penaltyCreditId, autoCharge, splitPayment, penaltyBreakdown } = await req.json();
    
    logStep('Received penalty charge request', { bookingId, amount, description, penaltyCreditId, autoCharge, splitPayment });

    if (!bookingId || !amount || !description) {
      throw new Error('Missing required parameters: bookingId, amount, description');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get booking details including user information
    logStep('Fetching booking details');
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!bookings_renter_id_fkey(email, full_name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      logStep('Booking fetch error', bookingError);
      throw new Error('Booking not found');
    }

    const userEmail = booking.profiles?.email;
    const userName = booking.profiles?.full_name || 'Customer';
    
    logStep('Booking details retrieved', { userEmail, userName, paymentIntentId: booking.payment_intent_id });

    if (!userEmail) {
      throw new Error('User email not found');
    }

    // Find the Stripe customer
    logStep('Finding Stripe customer');
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      throw new Error('Stripe customer not found');
    }

    const customer = customers.data[0];
    logStep('Customer found', { customerId: customer.id });

    // If autoCharge is enabled, try to charge automatically with original payment method
    if (autoCharge) {
      try {
        // Get the payment method used for the original booking
        let paymentMethodId = null;
        
        if (booking.payment_intent_id) {
          logStep('Retrieving original payment intent', { paymentIntentId: booking.payment_intent_id });
          try {
            const originalPaymentIntent = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
            if (originalPaymentIntent.payment_method) {
              paymentMethodId = originalPaymentIntent.payment_method as string;
              logStep('Found payment method from original booking', { paymentMethodId });
            }
          } catch (error) {
            logStep('Could not retrieve original payment method', error);
          }
        }

        // If no payment method from booking, get customer's default
        if (!paymentMethodId) {
          logStep('Getting customer default payment method');
          const paymentMethods = await stripe.paymentMethods.list({
            customer: customer.id,
            type: 'card',
            limit: 1
          });
          
          if (paymentMethods.data.length > 0) {
            paymentMethodId = paymentMethods.data[0].id;
            logStep('Using customer default payment method', { paymentMethodId });
          }
        }

        if (paymentMethodId) {
          // Handle split payment for penalties (penalty fee to platform, hourly charge to owner)
          if (splitPayment && penaltyBreakdown) {
            logStep('Processing split payment for penalty', penaltyBreakdown);
            
            const results = [];
            
            // Charge penalty fee to platform (no transfer)
            if (penaltyBreakdown.penaltyFee > 0) {
              const penaltyIntent = await stripe.paymentIntents.create({
                amount: Math.round(penaltyBreakdown.penaltyFee * 100),
                currency: 'usd',
                customer: customer.id,
                payment_method: paymentMethodId,
                confirm: true,
                description: `Penalty Fee: Late checkout violation`,
                metadata: {
                  booking_id: bookingId,
                  penalty_credit_id: penaltyCreditId || '',
                  type: 'penalty_fee'
                }
              });
              results.push({ type: 'penalty_fee', paymentIntent: penaltyIntent });
            }
            
            // Charge hourly fee to platform, then transfer to owner
            if (penaltyBreakdown.hourlyCharge > 0) {
              // Get spot owner for transfer
              const { data: spot, error: spotError } = await supabase
                .from('parking_spots')
                .select('owner_id')
                .eq('id', booking.spot_id)
                .single();
              
              if (!spotError && spot) {
                // Get owner's Stripe account
                const { data: payoutSettings } = await supabase
                  .from('payout_settings')
                  .select('stripe_connect_account_id')
                  .eq('user_id', spot.owner_id)
                  .single();
                
                const hourlyIntent = await stripe.paymentIntents.create({
                  amount: Math.round(penaltyBreakdown.hourlyCharge * 100),
                  currency: 'usd',
                  customer: customer.id,
                  payment_method: paymentMethodId,
                  confirm: true,
                  description: `Hourly Extension: Additional parking time`,
                  metadata: {
                    booking_id: bookingId,
                    penalty_credit_id: penaltyCreditId || '',
                    type: 'hourly_charge'
                  }
                });
                
                // Transfer to owner if Stripe Connect is set up
                if (payoutSettings?.stripe_connect_account_id && hourlyIntent.status === 'succeeded') {
                  const ownerAmount = Math.round(penaltyBreakdown.hourlyCharge * 0.85 * 100); // 85% to owner
                  await stripe.transfers.create({
                    amount: ownerAmount,
                    currency: 'usd',
                    destination: payoutSettings.stripe_connect_account_id,
                    metadata: {
                      booking_id: bookingId,
                      type: 'hourly_extension_payout'
                    }
                  });
                }
                
                results.push({ type: 'hourly_charge', paymentIntent: hourlyIntent });
              }
            }
            
            const allSuccessful = results.every(r => r.paymentIntent.status === 'succeeded');
            
            // Update penalty credit
            if (penaltyCreditId) {
              await supabase
                .from('penalty_credits')
                .update({
                  status: allSuccessful ? 'paid' : 'processing',
                  updated_at: new Date().toISOString()
                })
                .eq('id', penaltyCreditId);
            }
            
            return new Response(JSON.stringify({
              success: allSuccessful,
              splitPayment: true,
              results: results.map(r => ({
                type: r.type,
                paymentIntentId: r.paymentIntent.id,
                status: r.paymentIntent.status
              })),
              message: allSuccessful ? 'Split payment completed successfully' : 'Split payment processing'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
            
          } else {
            // Regular single penalty charge
            logStep('Creating single penalty charge', { amount, paymentMethodId });
            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(amount * 100),
              currency: 'usd',
              customer: customer.id,
              payment_method: paymentMethodId,
              confirm: true,
              description: `Penalty: ${description}`,
              metadata: {
                booking_id: bookingId,
                penalty_credit_id: penaltyCreditId || '',
                type: 'penalty'
              }
            });

            logStep('Auto-charge payment intent created', { 
              paymentIntentId: paymentIntent.id, 
              status: paymentIntent.status 
            });

            // Update penalty credit
            if (penaltyCreditId) {
              await supabase
                .from('penalty_credits')
                .update({
                  status: paymentIntent.status === 'succeeded' ? 'paid' : 'processing',
                  updated_at: new Date().toISOString()
                })
                .eq('id', penaltyCreditId);
            }

            return new Response(JSON.stringify({
              success: paymentIntent.status === 'succeeded',
              paymentIntentId: paymentIntent.id,
              status: paymentIntent.status,
              message: paymentIntent.status === 'succeeded' 
                ? 'Payment completed automatically' 
                : 'Auto-charge failed'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
        }
      } catch (autoChargeError) {
        logStep('Auto-charge failed, falling back to Stripe checkout', autoChargeError);
        // Fall through to create Stripe checkout session
      }
    }

    // Fallback: Create Stripe checkout session for manual payment
    logStep('Creating Stripe checkout session for manual payment');
    
    let lineItems;
    if (splitPayment && penaltyBreakdown) {
      lineItems = [];
      if (penaltyBreakdown.penaltyFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: 'Late Checkout Penalty' },
            unit_amount: Math.round(penaltyBreakdown.penaltyFee * 100),
          },
          quantity: 1,
        });
      }
      if (penaltyBreakdown.hourlyCharge > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: 'Additional Parking Time' },
            unit_amount: Math.round(penaltyBreakdown.hourlyCharge * 100),
          },
          quantity: 1,
        });
      }
    } else {
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Penalty: ${description}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'https://app.arrivparking.com'}/bookings?payment=success`,
      cancel_url: `${req.headers.get('origin') || 'https://app.arrivparking.com'}/bookings?payment=cancelled`,
      metadata: {
        booking_id: bookingId,
        penalty_credit_id: penaltyCreditId || '',
        type: 'penalty'
      }
    });

    logStep('Stripe checkout session created', { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({
      success: false,
      redirectUrl: session.url,
      message: 'Redirecting to Stripe for payment'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep('Error processing penalty charge', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});