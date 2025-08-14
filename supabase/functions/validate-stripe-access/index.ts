import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated");

    const { stripeAccountId, operation } = await req.json();
    
    if (!stripeAccountId) {
      throw new Error("Stripe account ID is required");
    }

    // Log the access attempt
    await supabaseClient.rpc('log_security_event', {
      p_event_type: 'stripe_account_access_attempt',
      p_event_data: { 
        stripeAccountId: stripeAccountId.substring(0, 8) + '***', // Partially mask for logging
        operation,
        ipAddress: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
      },
      p_user_id: user.id
    });

    // Verify user owns this Stripe account
    const { data: payoutSettings, error: fetchError } = await supabaseClient
      .from('payout_settings')
      .select('stripe_connect_account_id, user_id')
      .eq('user_id', user.id)
      .eq('stripe_connect_account_id', stripeAccountId)
      .single();

    if (fetchError || !payoutSettings) {
      // Log unauthorized access attempt
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'unauthorized_stripe_access',
        p_event_data: { 
          stripeAccountId: stripeAccountId.substring(0, 8) + '***',
          operation,
          reason: 'Account not owned by user'
        },
        p_user_id: user.id
      });

      return new Response(JSON.stringify({
        valid: false,
        reason: "Unauthorized access to Stripe account"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Additional validation: Verify account exists and is active with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      
      if (!account || account.object !== 'account') {
        await supabaseClient.rpc('log_security_event', {
          p_event_type: 'invalid_stripe_account',
          p_event_data: { 
            stripeAccountId: stripeAccountId.substring(0, 8) + '***',
            operation,
            reason: 'Account not found or invalid'
          },
          p_user_id: user.id
        });

        return new Response(JSON.stringify({
          valid: false,
          reason: "Invalid Stripe account"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Log successful validation
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'stripe_account_validated',
        p_event_data: { 
          stripeAccountId: stripeAccountId.substring(0, 8) + '***',
          operation,
          accountStatus: account.charges_enabled ? 'active' : 'restricted'
        },
        p_user_id: user.id
      });

      return new Response(JSON.stringify({
        valid: true,
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError) {
      console.error("Stripe validation error:", stripeError);
      
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'stripe_validation_error',
        p_event_data: { 
          stripeAccountId: stripeAccountId.substring(0, 8) + '***',
          operation,
          error: stripeError.message
        },
        p_user_id: user.id
      });

      return new Response(JSON.stringify({
        valid: false,
        reason: "Stripe account validation failed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

  } catch (error) {
    console.error("Stripe access validation error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      valid: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});