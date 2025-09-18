import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arrivparking.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    // Enhanced authorization check (admin user or service role)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[CHARGE-PENALTY] Missing authorization header')
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    // Create admin client to verify role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (isServiceRole) {
      // Service role authorization for system operations (auto-close)
      console.log('[CHARGE-PENALTY] Service role authorization verified')
    } else {
      // User token authorization for manual admin operations
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
      
      if (userError || !user) {
        console.error('[CHARGE-PENALTY] Invalid user token:', userError)
        return new Response('Unauthorized', { 
          status: 401, 
          headers: corsHeaders 
        })
      }

      // Check if user has admin role
      const { data: userRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      if (!userRoles) {
        console.error('[CHARGE-PENALTY] User does not have admin role:', user.id)
        // Log security event
        await supabaseAdmin.rpc('log_security_event_enhanced', {
          p_event_type: 'unauthorized_admin_access_attempt',
          p_event_data: {
            function: 'charge-penalty',
            user_id: user.id,
            attempted_action: 'manual_penalty_charge'
          },
          p_user_id: user.id,
          p_severity: 'critical'
        })
        
        return new Response('Forbidden: Admin access required', { 
          status: 403, 
          headers: corsHeaders 
        })
      }

      // Log admin action
      await supabaseAdmin.rpc('log_admin_action', {
        p_action: 'charge_penalty_edge_function',
        p_target_resource: 'penalty_credits',
        p_details: { source: 'edge_function' }
      })

      console.log('[CHARGE-PENALTY] Admin authorization verified for user:', user.id)
    }
    logStep("Function started");

    const requestBody = await req.json();
    logStep("Raw request body received", requestBody);
    
    const { 
      bookingId, 
      amount, 
      description, 
      penaltyCreditId, 
      penaltyAmount, 
      hourlyCharges,
      totalOverageWithFees,
      ownerPayoutAmount,
      platformFee,
      processingFee,
      taxRate
    } = requestBody;
    
    // Ensure hourlyCharges is properly parsed as a number
    const parsedHourlyCharges = Number(hourlyCharges) || 0;
    logStep("Parsed hourlyCharges", { 
      original: hourlyCharges, 
      parsed: parsedHourlyCharges,
      type: typeof hourlyCharges 
    });

    if (!bookingId || !amount || !penaltyCreditId) {
      throw new Error("Missing required fields: bookingId, amount, and penaltyCreditId");
    }

    logStep("Request data received", { 
      bookingId, 
      amount, 
      description, 
      penaltyCreditId, 
      penaltyAmount, 
      hourlyCharges,
      totalOverageWithFees,
      ownerPayoutAmount,
      platformFee,
      processingFee,
      taxRate 
    });

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
      const hourlyChargesAmount = parsedHourlyCharges;
      logStep("Checking hourly charges amount", { 
        hourlyChargesAmount, 
        penaltyAmount,
        originalHourlyCharges: hourlyCharges,
        parsedHourlyCharges: parsedHourlyCharges
      });
      
      if (hourlyChargesAmount > 0) {
        // Get spot details for payout calculation
        const { data: spot, error: spotError } = await supabaseService
          .from('parking_spots')
          .select('owner_id, price_per_hour')
          .eq('id', booking.spot_id)
          .single();

        logStep("Spot lookup result", { spot, spotError });

        if (!spotError && spot) {
          // Get spot owner's Stripe Connect account using secure function
          const { data: payout_settings, error: payoutError } = await supabaseService
            .rpc('get_secure_payout_settings', { p_user_id: spot.owner_id })
            .maybeSingle();

          logStep("Secure payout settings lookup", { payout_settings, payoutError, spotOwnerId: spot.owner_id });

          if (payout_settings?.stripe_connect_account_id) {
            // Use the calculated owner payout amount from the trigger if provided, otherwise fallback to 93% calculation
            const actualOwnerPayout = ownerPayoutAmount || (hourlyChargesAmount * 0.93);
            const ownerPayoutCents = Math.round(actualOwnerPayout * 100);
            
            logStep("Creating transfer", { 
              hourlyChargesAmount, 
              ownerPayoutAmount: actualOwnerPayout,
              ownerPayoutCents,
              connectAccountId: payout_settings.stripe_connect_account_id 
            });
            
            try {
              // Validate Connect account can receive transfers
              const connectAccount = await stripe.accounts.retrieve(payout_settings.stripe_connect_account_id);
              logStep("Connect account status", {
                accountId: connectAccount.id,
                payoutsEnabled: connectAccount.payouts_enabled,
                transfersEnabled: connectAccount.capabilities?.transfers,
                chargesEnabled: connectAccount.charges_enabled
              });

              if (!connectAccount.payouts_enabled) {
                throw new Error(`Connect account ${connectAccount.id} does not have payouts enabled`);
              }

              // Check platform account balance
              const balance = await stripe.balance.retrieve();
              const availableUSD = balance.available.find(b => b.currency === 'usd')?.amount || 0;
              const pendingUSD = balance.pending.find(b => b.currency === 'usd')?.amount || 0;
              
              logStep("Platform balance check", {
                availableUSD,
                pendingUSD,
                requiredAmount: ownerPayoutCents,
                hasSufficientFunds: availableUSD >= ownerPayoutCents
              });

              if (availableUSD < ownerPayoutCents) {
                // Create a pending transfer record for later processing
                const { error: transferQueueError } = await supabaseService
                  .from('pending_transfers')
                  .insert({
                    booking_id: bookingId,
                    penalty_credit_id: penaltyCreditId,
                    destination_account: payout_settings.stripe_connect_account_id,
                    amount_cents: ownerPayoutCents,
                    currency: 'usd',
                    description: `Late checkout hourly charges for booking ${bookingId} (93% of $${hourlyChargesAmount} = $${actualOwnerPayout.toFixed(2)})`,
                    payment_intent_id: paymentIntent.id,
                    status: 'pending_funds',
                    metadata: {
                      booking_id: bookingId,
                      penalty_credit_id: penaltyCreditId,
                      type: 'late_checkout_hourly_payout',
                      hourly_charges: hourlyChargesAmount,
                      owner_share_percentage: 93,
                      spot_owner_id: spot.owner_id
                    }
                  });

                if (transferQueueError) {
                  logStep("Failed to queue transfer", { error: transferQueueError });
                } else {
                  logStep("Transfer queued for later processing due to insufficient funds", {
                    availableBalance: availableUSD,
                    requiredAmount: ownerPayoutCents,
                    shortfall: ownerPayoutCents - availableUSD
                  });
                }
                
                throw new Error(`Insufficient platform balance. Available: $${(availableUSD/100).toFixed(2)}, Required: $${(ownerPayoutCents/100).toFixed(2)}`);
              }

              // Create transfer with source_transaction for better fund tracking
              const transfer = await stripe.transfers.create({
                amount: ownerPayoutCents,
                currency: 'usd',
                destination: payout_settings.stripe_connect_account_id,
                source_transaction: paymentIntent.latest_charge as string,
                description: `Late checkout hourly charges for booking ${bookingId} (93% of $${hourlyChargesAmount} = $${actualOwnerPayout.toFixed(2)})`,
                metadata: {
                  booking_id: bookingId,
                  penalty_credit_id: penaltyCreditId,
                  type: 'late_checkout_hourly_payout',
                  hourly_charges: hourlyChargesAmount,
                  owner_share_percentage: 93,
                  spot_owner_id: spot.owner_id
                }
              });

              logStep("Transfer created successfully", { 
                transferId: transfer.id, 
                amount: transfer.amount,
                destination: transfer.destination,
                spotOwnerId: spot.owner_id,
                sourceTransaction: transfer.source_transaction
              });

              // Record successful transfer
              const { error: transferRecordError } = await supabaseService
                .from('completed_transfers')
                .insert({
                  booking_id: bookingId,
                  penalty_credit_id: penaltyCreditId,
                  stripe_transfer_id: transfer.id,
                  destination_account: transfer.destination,
                  amount_cents: transfer.amount,
                  currency: transfer.currency,
                  status: 'completed',
                  completed_at: new Date().toISOString()
                });

              if (transferRecordError) {
                logStep("Failed to record transfer completion", { error: transferRecordError });
              }

            } catch (transferError) {
              logStep("Transfer failed", { 
                error: transferError.message, 
                errorType: transferError.constructor.name,
                hourlyChargesAmount,
                ownerPayoutAmount: actualOwnerPayout,
                ownerPayoutCents,
                connectAccountId: payout_settings.stripe_connect_account_id
              });

              // Create failed transfer record for admin review
              const { error: failedTransferError } = await supabaseService
                .from('failed_transfers')
                .insert({
                  booking_id: bookingId,
                  penalty_credit_id: penaltyCreditId,
                  destination_account: payout_settings.stripe_connect_account_id,
                  amount_cents: ownerPayoutCents,
                  currency: 'usd',
                  error_message: transferError.message,
                  error_type: transferError.constructor.name,
                  payment_intent_id: paymentIntent.id,
                  status: 'failed',
                  metadata: {
                    booking_id: bookingId,
                    penalty_credit_id: penaltyCreditId,
                    type: 'late_checkout_hourly_payout',
                    hourly_charges: hourlyChargesAmount,
                    owner_share_percentage: 93,
                    spot_owner_id: spot.owner_id,
                    original_error: transferError.message
                  }
                });

              if (failedTransferError) {
                logStep("Failed to record transfer failure", { error: failedTransferError });
              }
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