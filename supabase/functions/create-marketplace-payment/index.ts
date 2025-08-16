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
    console.log("📝 Parsing request body...");
    const { booking_id } = await req.json();
    console.log("📝 Request data:", { booking_id });
    
    console.log("📝 Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log("📝 Getting user from auth header...");
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    console.log("📝 User authenticated:", { userId: user?.id, email: user?.email });
    
    if (!user?.email) throw new Error("User not authenticated");

    // Get booking details with parking spot and owner info
    console.log("📝 Fetching booking details...");
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        parking_spots:spot_id (
          *,
          profiles:owner_id (
            *,
            payout_settings (stripe_connect_account_id, payouts_enabled)
          )
        )
      `)
      .eq("id", booking_id)
      .eq("renter_id", user.id)
      .maybeSingle();

    console.log("📝 Booking query result:", { booking, bookingError });

    if (bookingError) {
      console.error("❌ Booking query error:", bookingError);
      throw new Error(`Database error: ${bookingError.message}`);
    }

    if (!booking) {
      console.error("❌ Booking not found for user:", { booking_id, user_id: user.id });
      throw new Error("Booking not found or unauthorized");
    }

    const spotOwner = booking.parking_spots.profiles;
    const payoutSettings = spotOwner.payout_settings?.[0];
    
    if (!payoutSettings?.stripe_connect_account_id || !payoutSettings?.payouts_enabled) {
      throw new Error("Spot owner hasn't completed payout setup");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate fees - platform takes 14% total (7% from renter + 7% from lister)
    // Get the actual base spot price from the parking spot
    let baseSpotPrice;
    if (booking.parking_spots.pricing_type === 'hourly') {
      baseSpotPrice = Math.round(parseFloat(booking.parking_spots.price_per_hour.toString()) * 100); // Convert to cents
    } else {
      baseSpotPrice = Math.round(parseFloat(booking.parking_spots.one_time_price.toString()) * 100); // Convert to cents
    }
    
    // Total amount includes base price + platform fee + tax
    const totalAmount = Math.round(parseFloat(booking.total_amount.toString()) * 100); // Convert to cents (what renter pays)
    
    const platformFeeFromRenter = Math.round(baseSpotPrice * 0.07); // 7% from renter side
    const platformFeeFromLister = Math.round(baseSpotPrice * 0.07); // 7% from lister side
    const totalPlatformFee = platformFeeFromRenter + platformFeeFromLister; // 14% total
    
    // Calculate Stripe processing fee (2.9% + $0.30)
    const stripeProcessingFee = Math.round(totalAmount * 0.029) + 30; // 2.9% + 30 cents
    
    // Lister gets base price minus their 7% platform fee and Stripe processing fee
    const listerAmount = baseSpotPrice - platformFeeFromLister - stripeProcessingFee;

    // Create Checkout session with marketplace setup
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
          amount: listerAmount, // Lister gets base price minus 7% platform fee and Stripe fees
        },
        application_fee_amount: totalPlatformFee, // Platform keeps 14% total
      },
      success_url: `${req.headers.get("origin")}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/book-spot/${booking.spot_id}`,
    });

    // Update booking with fee information
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("bookings").update({
      payment_intent_id: session.id,
      platform_fee_amount: totalPlatformFee / 100, // Store in dollars
      owner_payout_amount: listerAmount / 100, // Store in dollars (after Stripe fees)
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
    console.error("Error creating marketplace payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});