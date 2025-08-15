import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update booking status to confirmed
        const { error } = await supabaseService
          .from("bookings")
          .update({
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("Error updating booking status:", error);
          return new Response("Database update failed", { status: 500 });
        }

        console.log(`Payment succeeded for booking: ${paymentIntent.metadata.booking_id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update booking status to failed
        const { error } = await supabaseService
          .from("bookings")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("Error updating booking status:", error);
          return new Response("Database update failed", { status: 500 });
        }

        console.log(`Payment failed for booking: ${paymentIntent.metadata.booking_id}`);
        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        
        // Log successful transfer to owner with 7-day delay
        console.log(`Transfer created: ${transfer.id} for amount: ${transfer.amount} (7-day delayed payout)`);
        
        // Store transfer information in booking if metadata exists
        if (transfer.metadata?.booking_id) {
          const { error } = await supabaseService
            .from("bookings")
            .update({ 
              stripe_transfer_id: transfer.id,
              updated_at: new Date().toISOString()
            })
            .eq("id", transfer.metadata.booking_id);

          if (error) {
            console.error("Error updating booking with transfer ID:", error);
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        
        // Update payout settings with latest account status
        const { error } = await supabaseService
          .from("payout_settings")
          .update({
            payouts_enabled: account.payouts_enabled,
            onboarding_completed: account.details_submitted,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_connect_account_id", account.id);

        if (error) {
          console.error("Error updating payout settings:", error);
        }
        
        console.log(`Connect account updated: ${account.id}, payouts_enabled: ${account.payouts_enabled}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});