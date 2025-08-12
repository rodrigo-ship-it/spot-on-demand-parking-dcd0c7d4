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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) throw new Error("User not authenticated");

    // Get user's payout settings
    const { data: payoutSettings } = await supabaseClient
      .from("payout_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!payoutSettings?.stripe_connect_account_id) {
      return new Response(JSON.stringify({ 
        connected: false,
        onboarding_completed: false,
        payouts_enabled: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(payoutSettings.stripe_connect_account_id);
    
    const onboardingCompleted = account.details_submitted;
    const payoutsEnabled = account.payouts_enabled;

    // Update database with current status
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("payout_settings").update({
      onboarding_completed: onboardingCompleted,
      payouts_enabled: payoutsEnabled,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    return new Response(JSON.stringify({ 
      connected: true,
      onboarding_completed: onboardingCompleted,
      payouts_enabled: payoutsEnabled,
      account_id: payoutSettings.stripe_connect_account_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error checking Connect status:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});