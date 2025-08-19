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
    const { booking_id, refund_amount, reason, cancellation_fee } = await req.json();
    
    console.log("=== REFUND PROCESS STARTED ===");
    console.log("Request data:", { booking_id, refund_amount, reason, cancellation_fee });
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found in environment");
      throw new Error("Stripe configuration error");
    }
    console.log("Stripe key found:", stripeKey.substring(0, 10) + "...");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      console.error("User authentication failed");
      throw new Error("User not authenticated");
    }
    console.log("User authenticated:", user.id, user.email);

    // Use service role key to get booking details (bypasses RLS)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get booking details with payment intent
    const { data: booking, error: bookingError } = await supabaseService
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("renter_id", user.id)
      .single();

    if (bookingError) {
      console.error("Database error finding booking:", bookingError);
      throw new Error(`Database error: ${bookingError.message}`);
    }
    
    if (!booking) {
      console.error("Booking not found for ID:", booking_id, "User:", user.id);
      throw new Error("Booking not found or unauthorized");
    }

    console.log("Found booking:", booking.id, "Status:", booking.status, "Payment Intent:", booking.payment_intent_id);

    if (!booking.payment_intent_id) {
      console.error("No payment intent found for booking:", booking.id);
      throw new Error("No payment found for this booking");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Calculate refund amount in cents
    const refundAmountCents = Math.round(refund_amount * 100);
    console.log("Refund amount:", refund_amount, "-> cents:", refundAmountCents);

    console.log("Creating Stripe refund...");
    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      amount: refundAmountCents,
      reason: "requested_by_customer",
      metadata: {
        booking_id: booking.id,
        cancellation_fee: cancellation_fee?.toString() || "0",
        reason: reason
      }
    });

    console.log("Stripe refund created:", refund.id, "Status:", refund.status);

    // Log the refund in our database
    console.log("Logging refund to database...");
    const { error: insertError } = await supabaseService.from("refunds").insert({
      booking_id: booking.id,
      user_id: user.id,
      amount: refund_amount,
      reason: reason,
      stripe_refund_id: refund.id,
      status: "processed",
      processed_at: new Date().toISOString(),
      admin_notes: `Automatic cancellation refund. Cancellation fee: $${cancellation_fee?.toFixed(2) || '0.00'}`
    });

    if (insertError) {
      console.error("Error logging refund to database:", insertError);
      // Still return success since Stripe refund was created
    } else {
      console.log("Refund logged to database successfully");
    }

    console.log(`=== REFUND COMPLETED ===`);
    console.log(`Refund ID: ${refund.id}`);
    console.log(`Booking: ${booking.id}`);
    console.log(`Amount: $${refund_amount}`);

    return new Response(JSON.stringify({ 
      success: true,
      refund_id: refund.id,
      amount: refund_amount,
      status: refund.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("=== REFUND ERROR ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error instanceof Error ? error.stack : String(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});