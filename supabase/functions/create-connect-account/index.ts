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
    
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: "manual", // Enable instant payouts
          },
        },
      },
    });

    // Store the account ID in payout_settings
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("payout_settings").upsert({
      user_id: user.id,
      stripe_connect_account_id: account.id,
      onboarding_completed: false,
      payouts_enabled: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/manage-spots`,
      return_url: `${req.headers.get("origin")}/manage-spots?onboarding=complete`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ 
      account_id: account.id,
      onboarding_url: accountLink.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating Connect account:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});