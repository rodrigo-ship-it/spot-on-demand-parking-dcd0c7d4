import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔥 create-payment function called");
    
    // Parse request body with payment method support
    const { bookingId, baseAmount, currency = "usd", customerEmail, customerName, paymentMethod = "card" } = await req.json();
    console.log("📝 Booking ID received:", bookingId);

    if (!bookingId || !baseAmount) {
      throw new Error("Missing required fields: bookingId and baseAmount");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase service role client for booking and spot data
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create Supabase client for user auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !data.user) {
      throw new Error("User not authenticated");
    }
    const user = data.user;
    console.log("📝 User authenticated:", user.email);

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }
    console.log("📝 Booking found:", booking.id);

    // Get parking spot details to find the owner
    const { data: parkingSpot, error: spotError } = await supabaseService
      .from('parking_spots')
      .select('*')
      .eq('id', booking.spot_id)
      .single();

    if (spotError || !parkingSpot) {
      throw new Error(`Parking spot not found: ${spotError?.message}`);
    }
    console.log("📝 Spot owner:", parkingSpot.owner_id);

    // Get spot owner's payout settings
    const { data: payoutSettings, error: payoutError } = await supabaseService
      .from('payout_settings')
      .select('*')
      .eq('user_id', parkingSpot.owner_id)
      .single();

    if (payoutError || !payoutSettings?.stripe_connect_account_id) {
      throw new Error("Spot owner hasn't set up payouts yet. Please contact support.");
    }
    console.log("📝 Payout settings found for owner");

    // Calculate fees (using the same logic as marketplace payment)
    const totalAmountCents = Math.round(baseAmount * 100);
    const platformFeeRate = 0.07; // 7% platform fee
    const stripeFeeRate = 0.029; // 2.9% + $0.30
    const stripeFeeFixed = 30; // $0.30 in cents

    const platformFeeCents = Math.round(totalAmountCents * platformFeeRate);
    const stripeFeeCents = Math.round(totalAmountCents * stripeFeeRate) + stripeFeeFixed;
    const ownerPayoutCents = totalAmountCents - platformFeeCents - stripeFeeCents;

    console.log("📝 Fee breakdown:", {
      total: totalAmountCents,
      platformFee: platformFeeCents,
      stripeFee: stripeFeeCents,
      ownerPayout: ownerPayoutCents
    });

    // Use provided email or user email
    const email = customerEmail || user?.email;
    if (!email) {
      throw new Error("Email is required for payment");
    }

    // Check if a Stripe customer record exists for this email
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer if doesn't exist
      const customer = await stripe.customers.create({
        email,
        name: customerName || user?.user_metadata?.full_name || undefined,
      });
      customerId = customer.id;
    }

    // Create a marketplace payment session with transfers
    const sessionConfig = {
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { 
              name: "Parking Spot Rental",
              description: `${parkingSpot.title} - ${parkingSpot.address}`
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFeeCents + stripeFeeCents,
        transfer_data: {
          destination: payoutSettings.stripe_connect_account_id,
        },
        metadata: {
          booking_id: bookingId,
          owner_payout_amount: (ownerPayoutCents / 100).toString(),
          platform_fee_amount: (platformFeeCents / 100).toString(),
        },
      },
      success_url: `${req.headers.get("origin")}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${req.headers.get("origin")}/book-spot/${booking.spot_id}?cancelled=true`,
      metadata: {
        bookingId,
        totalAmount: baseAmount.toString(),
        currency,
        paymentMethod,
        ownerPayoutAmount: (ownerPayoutCents / 100).toString(),
        platformFeeAmount: (platformFeeCents / 100).toString(),
      },
    };

    // Add payment method types based on selection
    if (paymentMethod === "paypal") {
      sessionConfig.payment_method_types = ["card", "paypal"];
    } else if (paymentMethod === "apple_pay") {
      sessionConfig.payment_method_types = ["card"];
    } else {
      sessionConfig.payment_method_types = ["card"];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log("📝 Stripe session created:", session.id);

    // Update booking with payment details
    const { error: updateError } = await supabaseService
      .from("bookings")
      .update({ 
        payment_intent_id: session.id,
        status: 'pending_payment',
        platform_fee_amount: platformFeeCents / 100,
        owner_payout_amount: ownerPayoutCents / 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }
    console.log("📝 Booking updated with payment details");

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});