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
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated");

    // Get booking details with payment intent
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("renter_id", user.id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found or unauthorized");
    }

    if (!booking.payment_intent_id) {
      throw new Error("No payment found for this booking");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate refund amount in cents
    const refundAmountCents = Math.round(refund_amount * 100);

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

    // Log the refund in our database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("refunds").insert({
      booking_id: booking.id,
      user_id: user.id,
      amount: refund_amount,
      reason: reason,
      stripe_refund_id: refund.id,
      status: "processed",
      processed_at: new Date().toISOString(),
      admin_notes: `Automatic cancellation refund. Cancellation fee: $${cancellation_fee?.toFixed(2) || '0.00'}`
    });

    console.log(`Refund processed: ${refund.id} for booking ${booking.id} - Amount: $${refund_amount}`);

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
    console.error("Error processing refund:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});