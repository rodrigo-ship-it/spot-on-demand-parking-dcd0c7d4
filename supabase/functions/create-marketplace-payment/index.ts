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
    const { booking_id } = await req.json();
    console.log("📝 Booking ID received:", booking_id);
    console.log("📝 Booking ID type:", typeof booking_id);
    console.log("📝 Request headers:", Object.fromEntries(req.headers.entries()));
    
    if (!booking_id) {
      console.log("❌ No booking_id provided");
      return new Response(JSON.stringify({ error: "Missing booking_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create client for user authentication (with anon key)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Create service client for database operations (bypass RLS)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("❌ No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    console.log("📝 Token length:", token.length);
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    console.log("📝 Auth result:", { user: data.user?.email, authError });
    if (authError || !data.user?.email) {
      console.log("❌ Authentication failed:", authError);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = data.user;
    console.log("📝 User authenticated:", user.email);

    // Get booking details using service role to bypass RLS
    console.log("📝 Searching for booking:", booking_id);
    console.log("📝 Using service role with URL:", Deno.env.get("SUPABASE_URL"));
    console.log("📝 Service role key exists:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    
    // First, let's check what bookings exist
    const { data: allBookings, error: allBookingsError } = await supabaseService
      .from("bookings")
      .select("id, renter_id, spot_id, created_at")
      .limit(10);
    console.log("📝 All recent bookings:", { allBookings, allBookingsError });
    
    const { data: booking, error: bookingError } = await supabaseService
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .maybeSingle();

    console.log("📝 Booking result:", { booking, bookingError });

    if (bookingError) {
      console.log("❌ Booking query error:", bookingError);
      return new Response(JSON.stringify({ error: "Database error: " + bookingError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!booking) {
      console.log("❌ Booking not found - ID:", booking_id);
      return new Response(JSON.stringify({ 
        error: "Booking not found", 
        booking_id: booking_id,
        debug: "Booking does not exist in database"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get parking spot details separately
    const { data: parkingSpot, error: spotError } = await supabaseService
      .from("parking_spots")
      .select("*")
      .eq("id", booking.spot_id)
      .maybeSingle();

    console.log("📝 Parking spot result:", { parkingSpot, spotError });

    if (spotError || !parkingSpot) {
      console.log("❌ Parking spot not found:", { spotError, parkingSpot });
      return new Response(JSON.stringify({ error: "Parking spot not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get payout settings using service role to bypass RLS
    const { data: payoutSettings, error: payoutError } = await supabaseService
      .from("payout_settings")
      .select("*")
      .eq("user_id", parkingSpot.owner_id)
      .maybeSingle();

    if (payoutError || !payoutSettings?.stripe_connect_account_id || !payoutSettings?.payouts_enabled) {
      return new Response(JSON.stringify({ error: "Spot owner hasn't completed payout setup" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate fees
    const baseSpotPrice = Math.round(parseFloat(parkingSpot.one_time_price.toString()) * 100);
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
            name: `Parking: ${parkingSpot.title}`,
            description: `${parkingSpot.address}`,
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      }],
      metadata: {
        booking_id: booking.id,
        owner_id: parkingSpot.owner_id,
        platform_fee: totalPlatformFee.toString(),
        lister_amount: listerAmount.toString(),
      },
      payment_intent_data: {
        transfer_data: {
          destination: payoutSettings.stripe_connect_account_id,
          amount: listerAmount,
        },
      },
      success_url: `${req.headers.get("origin")}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/book-spot/${booking.spot_id}`,
    });

    console.log("📝 Checkout session created successfully");

    // Update booking with payment details
    await supabaseService.from("bookings").update({
      payment_intent_id: session.id,
      platform_fee_amount: totalPlatformFee / 100,
      owner_payout_amount: listerAmount / 100,
      updated_at: new Date().toISOString(),
    }).eq("id", booking_id);

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
      error: error.message || "Payment processing failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});