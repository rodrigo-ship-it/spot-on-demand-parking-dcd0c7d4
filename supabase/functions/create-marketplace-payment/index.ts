import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated");

    // Get booking details with parking spot and owner info
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
      .single();

    if (bookingError || !booking) {
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

    // Calculate fees - platform takes 7% from both sides
    // Handle different pricing types
    let totalAmount;
    if (booking.parking_spots.pricing_type === 'hourly') {
      totalAmount = Math.round(parseFloat(booking.total_amount.toString()) * 100); // Convert to cents (what renter pays)
    } else {
      // For one-time pricing, the total amount should already be calculated correctly
      totalAmount = Math.round(parseFloat(booking.total_amount.toString()) * 100); // Convert to cents
    }
    
    const baseSpotPrice = Math.round(totalAmount / 1.0875 / 1.07); // Remove tax and platform fee to get base price
    const platformFeeFromRenter = Math.round(baseSpotPrice * 0.07); // 7% from renter side
    const platformFeeFromOwner = Math.round(baseSpotPrice * 0.07); // 7% from owner side
    const totalPlatformFee = platformFeeFromRenter + platformFeeFromOwner; // 14% total
    const ownerAmount = Math.round(baseSpotPrice - platformFeeFromOwner); // Owner gets base price minus 7%

    // Create payment intent with marketplace setup
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "usd",
      customer: user.email,
      metadata: {
        booking_id: booking.id,
        owner_id: booking.parking_spots.owner_id,
        platform_fee: totalPlatformFee.toString(),
        owner_amount: ownerAmount.toString(),
      },
      transfer_data: {
        destination: payoutSettings.stripe_connect_account_id,
        amount: ownerAmount, // Owner gets 93% (minus Stripe fees)
      },
      application_fee_amount: totalPlatformFee, // Platform keeps 14% total
    });

    // Update booking with fee information
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("bookings").update({
      payment_intent_id: paymentIntent.id,
      platform_fee_amount: totalPlatformFee / 100, // Store in dollars
      owner_payout_amount: ownerAmount / 100, // Store in dollars
      updated_at: new Date().toISOString(),
    }).eq("id", booking_id);

    return new Response(JSON.stringify({ 
      client_secret: paymentIntent.client_secret,
      platform_fee: totalPlatformFee / 100,
      owner_amount: ownerAmount / 100,
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