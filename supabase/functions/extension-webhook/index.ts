import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔥 extension-webhook function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const body = await req.text();
    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("💳 Extension payment completed:", session.id);

      // Check if this is an extension payment
      if (session.metadata?.type === "extension") {
        const bookingId = session.metadata.booking_id;
        const extensionHours = parseInt(session.metadata.extension_hours);
        const newEndTime = session.metadata.new_end_time;

        console.log("🔄 Processing extension:", { bookingId, extensionHours, newEndTime });

        // Update booking with new end time
        const { error: bookingError } = await supabaseService
          .from('bookings')
          .update({
            end_time: new Date(newEndTime).toISOString().slice(0, -1), // Remove Z for timestamp without timezone
            end_time_utc: newEndTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId);

        if (bookingError) {
          console.error("Failed to update booking:", bookingError);
          return new Response("Failed to update booking", { status: 500 });
        }

        // Update extension status
        const { error: extensionError } = await supabaseService
          .from('extensions')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string
          })
          .eq('booking_id', bookingId)
          .eq('status', 'payment_pending');

        if (extensionError) {
          console.error("Failed to update extension:", extensionError);
          return new Response("Failed to update extension", { status: 500 });
        }

        console.log("✅ Extension processed successfully");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Extension webhook error:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});