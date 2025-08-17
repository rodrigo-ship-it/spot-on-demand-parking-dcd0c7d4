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
    // Parse request body with payment method support
    const { bookingId, baseAmount, currency = "usd", customerEmail, customerName, paymentMethod = "card" } = await req.json();

    if (!bookingId || !baseAmount) {
      throw new Error("Missing required fields: bookingId and baseAmount");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase clients
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
    }

    // Get booking and spot data to calculate lister payout
    const { data: booking } = await supabaseService
      .from('bookings')
      .select('*, parking_spots(*)')
      .eq('id', bookingId)
      .single();

    if (!booking?.parking_spots) {
      throw new Error("Booking or parking spot not found");
    }

    const parkingSpot = booking.parking_spots;

    // Get payout settings for the spot owner
    const { data: payoutSettings } = await supabaseService
      .from("payout_settings")
      .select("*")
      .eq("user_id", parkingSpot.owner_id)
      .maybeSingle();

    // Use provided email or user email or default
    const email = customerEmail || user?.email || "guest@example.com";

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

    // Calculate the same fees as marketplace payment
    const totalAmount = Math.round(baseAmount * 100); // Total amount in cents
    const baseSpotPrice = Math.round((baseAmount / 1.0875 / 1.07) * 100); // Reverse calculate base price
    const platformFeeFromLister = Math.round(baseSpotPrice * 0.07);
    const stripeProcessingFee = Math.round(totalAmount * 0.029) + 30;
    const listerAmount = baseSpotPrice - platformFeeFromLister - stripeProcessingFee;

    // Create payment session config
    const sessionConfig = {
      customer: customerId,
      mode: "payment",
      payment_method_types: paymentMethod === "paypal" ? ["card", "paypal"] : ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { 
              name: "Parking Spot Rental",
              description: `Booking ID: ${bookingId}`
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${req.headers.get("origin")}/book-spot/${parkingSpot.id}?cancelled=true`,
      metadata: {
        bookingId,
        totalAmount: baseAmount.toString(),
        currency,
        paymentMethod,
        owner_id: parkingSpot.owner_id,
        lister_amount: (listerAmount / 100).toString(),
      },
    };

    // Add transfer to spot owner if they have payout settings
    if (payoutSettings?.stripe_connect_account_id && payoutSettings?.payouts_enabled) {
      sessionConfig.payment_intent_data = {
        transfer_data: {
          destination: payoutSettings.stripe_connect_account_id,
          amount: listerAmount,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Update booking with Stripe session ID using service role
    try {
      await supabaseService
        .from("bookings")
        .update({ 
          payment_intent_id: session.id,
          status: 'pending_payment',
          owner_payout_amount: listerAmount / 100,
          platform_fee_amount: platformFeeFromLister / 100,
        })
        .eq('id', bookingId);
    } catch (error) {
      console.error('Error updating booking:', error);
      // Continue even if this fails
    }

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