import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { bookingId, recipientId } = await req.json();

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        parking_spots (owner_id)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found or access denied");
    }

    // Verify user is either renter or owner
    const isRenter = booking.renter_id === user.id;
    const isOwner = booking.parking_spots?.owner_id === user.id;
    
    if (!isRenter && !isOwner) {
      throw new Error("Access denied to this booking");
    }

    // Create call session in database
    const { data: callSession, error: sessionError } = await supabaseClient
      .from("call_sessions")
      .insert({
        booking_id: bookingId,
        caller_id: user.id,
        recipient_id: recipientId,
        status: 'active'
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error("Failed to create call session");
    }

    // In a real implementation, you would:
    // 1. Use Twilio to create a proxy number
    // 2. Set up call forwarding
    // 3. Store the Twilio session ID
    
    // For now, return a simulated response
    const mockProxyNumber = "+1-555-ARRIV-1";
    
    return new Response(JSON.stringify({
      sessionId: callSession.id,
      proxyNumber: mockProxyNumber,
      instructions: "Call this number to connect to the other party. Both numbers will show 'Arriv Parking' as caller ID.",
      expiresAt: callSession.expires_at
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error creating call session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});