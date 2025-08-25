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
    
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY"); 
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    console.log('🔑 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
      hasStripeKey: !!stripeKey
    });

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !stripeKey) {
      throw new Error("Missing required environment variables");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log('🔐 Authenticating user...');
    
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) throw authError;
    
    const user = data.user;
    if (!user?.id) throw new Error("User not authenticated");
    
    console.log('✅ User authenticated:', user.id);

    // Use service role to get payout settings
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

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
      throw new Error("No Stripe Connect account found. Please set up payouts first.");
    }

    console.log('⚡ Initializing Stripe...');
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log('🔗 Creating account link...');
    const origin = req.headers.get("origin") || "https://801a0f2c-c78b-4fa0-9871-10f04e2f55b7.sandbox.lovable.dev";
    
    const accountLink = await stripe.accountLinks.create({
      account: payoutSettings.stripe_connect_account_id,
      refresh_url: `${origin}/profile`,
      return_url: `${origin}/profile?updated=true`,
      type: "account_update",
    });

    console.log('✅ Account link created successfully');

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
      error: errorMessage,
      details: "Check function logs for more information"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});