import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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