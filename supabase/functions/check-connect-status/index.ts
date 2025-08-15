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
    console.log('Starting check-connect-status function');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      console.log('User not authenticated');
      throw new Error("User not authenticated");
    }
    
    console.log('User authenticated:', user.id);

    // Get user's payout settings
    const { data: payoutSettings, error: dbError } = await supabaseClient
      .from("payout_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log('Payout settings from DB:', payoutSettings);
    console.log('DB error:', dbError);
    console.log('stripe_connect_account_id field:', payoutSettings?.stripe_connect_account_id);
    console.log('All fields:', Object.keys(payoutSettings || {}));

    if (!payoutSettings?.stripe_connect_account_id) {
      console.log('No stripe_connect_account_id found');
      console.log('Available fields:', payoutSettings ? Object.keys(payoutSettings) : 'null');
      console.log('stripe_connect_account_id value:', payoutSettings?.stripe_connect_account_id);
      return new Response(JSON.stringify({ 
        connected: false,
        onboarding_completed: false,
        payouts_enabled: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log('Stripe Connect Account ID:', payoutSettings.stripe_connect_account_id);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check account status with Stripe
    console.log('Checking Stripe account status...');
    const account = await stripe.accounts.retrieve(payoutSettings.stripe_connect_account_id);
    console.log('Stripe account details_submitted:', account.details_submitted);
    console.log('Stripe account payouts_enabled:', account.payouts_enabled);
    
    const onboardingCompleted = account.details_submitted;
    const payoutsEnabled = account.payouts_enabled;

    // Update database with current status
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('Updating database with status:', { onboardingCompleted, payoutsEnabled });
    
    const { error: updateError } = await supabaseService.from("payout_settings").update({
      onboarding_completed: onboardingCompleted,
      payouts_enabled: payoutsEnabled,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    if (updateError) {
      console.error('Error updating payout settings:', updateError);
    } else {
      console.log('Successfully updated payout settings');
    }

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