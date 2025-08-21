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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const requestBody = await req.json();
    const { bookingId, amount, description, penaltyCreditId, penaltyAmount, hourlyCharges } = requestBody;

    if (!bookingId || !amount || !penaltyCreditId) {
      throw new Error("Missing required fields: bookingId, amount, and penaltyCreditId");
    }

    logStep("Request data received", { bookingId, amount, description, penaltyCreditId, penaltyAmount, hourlyCharges });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get booking data with user information using service role client
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select('*, renter_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Get user profile separately to avoid RLS issues
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', booking.renter_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`User profile not found: ${profileError?.message}`);
    }

    logStep("Booking and profile found", { bookingId, userEmail: profile.email });

    const userEmail = profile.email;
    const userName = profile.full_name;

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    // Get the user's default payment method or the one used for this booking
    let paymentMethodId = null;

    // First, try to get the payment method used for the original booking
    if (booking.payment_intent_id) {
      try {
        logStep("Looking for payment method from booking payment intent", { payment_intent_id: booking.payment_intent_id });
        
        // Get the checkout session to find the payment intent
        const session = await stripe.checkout.sessions.retrieve(booking.payment_intent_id, {
          expand: ['payment_intent']
        });
        
        if (session.payment_intent && typeof session.payment_intent === 'object' && session.payment_intent.payment_method) {
          paymentMethodId = session.payment_intent.payment_method as string;
          logStep("Found payment method from booking", { paymentMethodId });
        }
      } catch (error) {
        logStep("Could not retrieve payment method from booking", { error: error.message });
      }
    }

    // If we couldn't find the payment method from the booking, get the customer's default
    if (!paymentMethodId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 1,
      });

      if (paymentMethods.data.length === 0) {
        throw new Error("No payment methods found for this customer");
      }

      paymentMethodId = paymentMethods.data[0].id;
      logStep("Using customer's default payment method", { paymentMethodId });
    }

    // Calculate amount in cents
    const amountCents = Math.round(amount * 100);
    logStep("Charging penalty", { amountCents, description });

    // Create the payment intent
    const origin = req.headers.get("origin") || "https://qwqgywmjwkuhwfnjoqgv.supabase.co";
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${origin}/bookings`,
      description: `Parking Penalty: ${description}`,
      metadata: {
        booking_id: bookingId,
        penalty_credit_id: penaltyCreditId,
        penalty_type: 'late_checkout',
        user_id: booking.renter_id
      }
    });

    logStep("Payment intent created", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // If payment succeeded, handle the payout distribution
    if (paymentIntent.status === 'succeeded') {
      logStep("Payment succeeded, processing payout distribution");
      
      // Only transfer spot owner's share of hourly charges (93%), penalty stays with company
      const hourlyChargesAmount = hourlyCharges || 0;
      logStep("Checking hourly charges amount", { hourlyChargesAmount, penaltyAmount });
      
      if (hourlyChargesAmount > 0) {
        // Get spot details for payout calculation
        const { data: spot, error: spotError } = await supabaseService
          .from('parking_spots')
          .select('owner_id, price_per_hour')
          .eq('id', booking.spot_id)
          .single();

        logStep("Spot lookup result", { spot, spotError });

        if (!spotError && spot) {
          // Get spot owner's Stripe Connect account
          const { data: payout_settings, error: payoutError } = await supabaseService
            .from('payout_settings')
            .select('stripe_connect_account_id')
            .eq('user_id', spot.owner_id)
            .single();

          logStep("Payout settings lookup", { payout_settings, payoutError, spotOwnerId: spot.owner_id });

          if (payout_settings?.stripe_connect_account_id) {
            // Calculate owner payout: 93% of ONLY the hourly charges (not the penalty)
            const ownerPayoutAmount = Math.round(hourlyChargesAmount * 100 * 0.93); // Convert to cents and take 93%
            
            logStep("Creating transfer", { 
              hourlyChargesAmount, 
              ownerPayoutAmount, 
              connectAccountId: payout_settings.stripe_connect_account_id 
            });
            
            try {
              // Create transfer to spot owner (only for hourly overstay charges)
              const transfer = await stripe.transfers.create({
                amount: ownerPayoutAmount,
                currency: 'usd',
                destination: payout_settings.stripe_connect_account_id,
                description: `Late checkout hourly charges for booking ${bookingId} (93% of $${hourlyChargesAmount})`,
                metadata: {
                  booking_id: bookingId,
                  penalty_credit_id: penaltyCreditId,
                  type: 'late_checkout_hourly_payout',
                  hourly_charges: hourlyChargesAmount,
                  owner_share_percentage: 93
                }
              });

              logStep("Transfer created successfully", { 
                transferId: transfer.id, 
                amount: transfer.amount,
                destination: transfer.destination,
                spotOwnerId: spot.owner_id
              });
            } catch (transferError) {
              logStep("Transfer failed", { 
                error: transferError.message, 
                errorType: transferError.constructor.name,
                hourlyChargesAmount,
                ownerPayoutAmount,
                connectAccountId: payout_settings.stripe_connect_account_id
              });
            }
          } else {
            logStep("No Stripe Connect account found for spot owner", { 
              spotOwnerId: spot.owner_id,
              payoutSettings: payout_settings
            });
          }
        } else {
          logStep("Error getting spot details", { spotError, bookingSpotId: booking.spot_id });
        }
      } else {
        logStep("No hourly charges to transfer, penalty only");
      }
    }

    // Update the penalty credit with payment information
    const { error: updateError } = await supabaseService
      .from('penalty_credits')
      .update({
        status: paymentIntent.status === 'succeeded' ? 'paid' : 'payment_pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', penaltyCreditId);

    if (updateError) {
      logStep("Error updating penalty credit", { error: updateError });
    } else {
      logStep("Penalty credit updated successfully");
    }

    // If payment succeeded, we can mark it as paid
    if (paymentIntent.status === 'succeeded') {
      logStep("Payment succeeded immediately");
      return new Response(JSON.stringify({ 
        success: true,
        paymentIntentId: paymentIntent.id,
        status: 'succeeded',
        message: `Penalty of $${amount} charged successfully`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("Payment requires additional action", { status: paymentIntent.status });
      return new Response(JSON.stringify({ 
        success: false,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        requires_action: true,
        client_secret: paymentIntent.client_secret,
        message: `Payment requires additional authentication`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in charge-penalty", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});