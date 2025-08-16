import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔥 create-marketplace-payment function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📝 Starting function execution");
    
    const { booking_id } = await req.json();
    console.log("📝 Booking ID received:", booking_id);
    
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "Missing booking_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("📝 Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log("📝 Getting user from auth header...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    const user = data.user;
    console.log("📝 User authenticated:", { userId: user?.id, email: user?.email });
    
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Get booking details with parking spot
    console.log("📝 Fetching booking details...");
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        parking_spots!inner (*)
      `)
      .eq("id", booking_id)
      .maybeSingle();

    console.log("📝 Booking query result:", { booking, bookingError });

    if (bookingError) {
      console.error("❌ Booking query error:", bookingError);
      throw new Error(`Database error: ${bookingError.message}`);
    }

    if (!booking) {
      console.error("❌ Booking not found");
      throw new Error("Booking not found or unauthorized");
    }

    // Get the spot owner's payout settings
    console.log("📝 Fetching payout settings for owner:", booking.parking_spots.owner_id);
    const { data: payoutSettings, error: payoutError } = await supabaseClient
      .from("payout_settings")
      .select("*")
      .eq("user_id", booking.parking_spots.owner_id)
      .maybeSingle();

    console.log("📝 Payout settings result:", { payoutSettings, payoutError });
    
    if (payoutError) {
      console.error("❌ Payout settings query error:", payoutError);
      throw new Error(`Database error: ${payoutError.message}`);
    }
    
    if (!payoutSettings?.stripe_connect_account_id || !payoutSettings?.payouts_enabled) {
      throw new Error("Spot owner hasn't completed payout setup");
    }

    console.log("📝 Initializing Stripe...");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate fees
    let baseSpotPrice;
    if (booking.parking_spots.pricing_type === 'hourly') {
      baseSpotPrice = Math.round(parseFloat(booking.parking_spots.price_per_hour.toString()) * 100);
    } else {
      baseSpotPrice = Math.round(parseFloat(booking.parking_spots.one_time_price.toString()) * 100);
    }
    
    const totalAmount = Math.round(parseFloat(booking.total_amount.toString()) * 100);
    const platformFeeFromRenter = Math.round(baseSpotPrice * 0.07);
    const platformFeeFromLister = Math.round(baseSpotPrice * 0.07);
    const totalPlatformFee = platformFeeFromRenter + platformFeeFromLister;
    const stripeProcessingFee = Math.round(totalAmount * 0.029) + 30;
    const listerAmount = baseSpotPrice - platformFeeFromLister - stripeProcessingFee;

    console.log("📝 Creating Stripe checkout session...");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Parking: ${booking.parking_spots.title}`,
            description: `${booking.parking_spots.address}`,
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      }],
      metadata: {
        booking_id: booking.id,
        owner_id: booking.parking_spots.owner_id,
        platform_fee: totalPlatformFee.toString(),
        lister_amount: listerAmount.toString(),
        stripe_processing_fee: stripeProcessingFee.toString(),
        base_spot_price: baseSpotPrice.toString(),
      },
      payment_intent_data: {
        transfer_data: {
          destination: payoutSettings.stripe_connect_account_id,
          amount: listerAmount,
        },
        application_fee_amount: totalPlatformFee,
      },
      success_url: `${req.headers.get("origin")}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/book-spot/${booking.spot_id}`,
    });

    console.log("📝 Checkout session created:", session.id);

    // Update booking with payment info
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("bookings").update({
      payment_intent_id: session.id,
      platform_fee_amount: totalPlatformFee / 100,
      owner_payout_amount: listerAmount / 100,
      updated_at: new Date().toISOString(),
    }).eq("id", booking_id);

    console.log("📝 Returning checkout URL:", session.url);
    return new Response(JSON.stringify({ 
      checkout_url: session.url,
      platform_fee: totalPlatformFee / 100,
      lister_amount: listerAmount / 100,
      stripe_processing_fee: stripeProcessingFee / 100,
      base_spot_price: baseSpotPrice / 100,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Function error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: `Function error: ${error.message}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});