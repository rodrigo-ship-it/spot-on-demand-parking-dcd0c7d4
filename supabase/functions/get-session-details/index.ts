import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔥 get-session-details function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    console.log("📝 Request data:", { session_id });
    
    if (!session_id) {
      console.log("❌ Missing session_id");
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get the checkout session details
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent']
    });
    console.log("📝 Session retrieved:", { 
      id: session.id, 
      payment_intent: session.payment_intent,
      payment_status: session.payment_status,
      metadata: session.metadata 
    });

    // Extract payment_intent_id - handle both string and expanded object
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id;
    
    console.log("🔍 [PAYMENT_INTENT_EXTRACTION] Type:", typeof session.payment_intent, "ID:", paymentIntentId);

    return new Response(JSON.stringify({ 
      payment_intent_id: paymentIntentId,
      payment_status: session.payment_status,
      customer_email: session.customer_email || session.customer_details?.email,
      amount_total: session.amount_total,
      session_id: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Function error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to retrieve session details"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});