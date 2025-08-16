import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔥 create-marketplace-payment function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📝 Step 1: Function started");
    
    const { booking_id } = await req.json();
    console.log("📝 Step 2: Booking ID received:", booking_id);
    
    if (!booking_id) {
      console.log("❌ Missing booking_id");
      return new Response(JSON.stringify({ error: "Missing booking_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("📝 Step 3: Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    console.log("📝 Step 3: Supabase client created");

    console.log("📝 Step 4: Getting user from auth header...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("❌ No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    console.log("📝 Step 4: Token extracted, length:", token.length);
    
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      console.log("❌ Auth error:", authError);
      return new Response(JSON.stringify({ error: `Authentication failed: ${authError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = data.user;
    console.log("📝 Step 4: User authenticated:", { userId: user?.id, email: user?.email });
    
    if (!user?.email) {
      console.log("❌ User not authenticated");
      return new Response(JSON.stringify({ error: "User not authenticated or email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("📝 Step 5: Fetching booking details...");
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        parking_spots!inner (*)
      `)
      .eq("id", booking_id)
      .maybeSingle();

    console.log("📝 Step 5: Booking query completed:", { hasBooking: !!booking, bookingError });

    if (bookingError) {
      console.error("❌ Booking query error:", bookingError);
      return new Response(JSON.stringify({ error: `Database error: ${bookingError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!booking) {
      console.error("❌ Booking not found");
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    console.log("📝 Step 6: Checking payout settings...");
    const { data: payoutSettings, error: payoutError } = await supabaseClient
      .from("payout_settings")
      .select("*")
      .eq("user_id", booking.parking_spots.owner_id)
      .maybeSingle();

    console.log("📝 Step 6: Payout settings:", { hasSettings: !!payoutSettings, payoutError });
    
    if (payoutError) {
      console.error("❌ Payout settings query error:", payoutError);
      return new Response(JSON.stringify({ error: `Database error: ${payoutError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    if (!payoutSettings?.stripe_connect_account_id || !payoutSettings?.payouts_enabled) {
      console.log("❌ Payout settings not ready");
      return new Response(JSON.stringify({ error: "Spot owner hasn't completed payout setup" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("📝 Step 7: All checks passed - returning success");
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "All steps completed successfully",
      debug_info: {
        booking_id,
        user_id: user.id,
        owner_id: booking.parking_spots.owner_id,
        has_payout_settings: true
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(JSON.stringify({ 
      error: "Unexpected error occurred",
      message: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});