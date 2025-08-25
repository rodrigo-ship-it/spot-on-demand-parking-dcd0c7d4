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
    console.log('🚀 Starting create-connect-portal function');
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw authError;
    
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");
    
    console.log('✅ User authenticated:', user.id);

    // Get payout settings using service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('🔍 Fetching payout settings...');
    const { data: payoutSettings, error: dbError } = await supabaseService
      .from("payout_settings")
      .select("stripe_connect_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log('💳 Payout settings result:', { payoutSettings, dbError });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!payoutSettings?.stripe_connect_account_id) {
      throw new Error("No Stripe Connect account found. Please set up payouts first using the 'Set Up Payouts' button above.");
    }

    console.log('⚡ Initializing Stripe...');
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    console.log('🔍 Checking account status for:', payoutSettings.stripe_connect_account_id);
    
    // First, check the account status to determine the correct link type
    const account = await stripe.accounts.retrieve(payoutSettings.stripe_connect_account_id);
    
    console.log('💳 Account status:', {
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled
    });

    // Determine the correct link type based on account status
    const linkType = account.details_submitted ? "account_update" : "account_onboarding";
    
    console.log('🔗 Creating account link with type:', linkType);
    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    const accountLink = await stripe.accountLinks.create({
      account: payoutSettings.stripe_connect_account_id,
      refresh_url: `${origin}/profile`,
      return_url: `${origin}/profile?updated=true`,
      type: linkType,
    });

    console.log('✅ Account link created successfully with type:', linkType);

    return new Response(JSON.stringify({ 
      url: accountLink.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Error in create-connect-portal:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});