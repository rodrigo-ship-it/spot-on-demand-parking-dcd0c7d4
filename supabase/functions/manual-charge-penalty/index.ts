import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arrivparking.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    // Enhanced admin authorization check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Create admin client to verify role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Check if user has admin role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!userRoles) {
      // Log security event
      await supabaseAdmin.rpc('log_security_event_enhanced', {
        p_event_type: 'unauthorized_admin_access_attempt',
        p_event_data: {
          function: 'manual-charge-penalty',
          user_id: user.id,
          attempted_action: 'manual_charge_penalty'
        },
        p_user_id: user.id,
        p_severity: 'critical'
      })
      
      return new Response('Forbidden: Admin access required', { 
        status: 403, 
        headers: corsHeaders 
      })
    }
    const { penaltyCreditId } = await req.json();
    
    if (!penaltyCreditId) {
      throw new Error("penaltyCreditId is required");
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get penalty credit details
    const { data: penaltyCredit, error: penaltyError } = await supabase
      .from("penalty_credits")
      .select(`
        *,
        bookings!inner(
          id,
          renter_id,
          total_amount
        )
      `)
      .eq("id", penaltyCreditId)
      .single();

    if (penaltyError) {
      throw new Error(`Failed to fetch penalty credit: ${penaltyError.message}`);
    }

    // Call the charge-penalty function
    const { data: chargeResult, error: chargeError } = await supabase.functions.invoke(
      "charge-penalty",
      {
        body: {
          bookingId: penaltyCredit.booking_id,
          amount: Number(penaltyCredit.amount),
          description: penaltyCredit.description,
          penaltyCreditId: penaltyCredit.id
        }
      }
    );

    if (chargeError) {
      throw new Error(`Failed to charge penalty: ${chargeError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Penalty charge processed successfully",
        result: chargeResult
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error processing manual charge:", error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});