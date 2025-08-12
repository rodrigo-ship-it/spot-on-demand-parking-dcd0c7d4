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

    // Get user profiles for phone numbers
    const { data: callerProfile } = await supabaseClient
      .from("profiles")
      .select("phone")
      .eq("user_id", user.id)
      .single();

    const { data: recipientProfile } = await supabaseClient
      .from("profiles")
      .select("phone")
      .eq("user_id", recipientId)
      .single();

    if (!callerProfile?.phone || !recipientProfile?.phone) {
      throw new Error("Both users must have phone numbers to make calls");
    }

    // Create Twilio proxy session
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    
    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error("Twilio credentials not configured");
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    // Create a proxy session
    const proxyResponse = await fetch(
      `https://proxy.twilio.com/v1/Services/${twilioAccountSid}/Sessions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          UniqueName: callSession.id,
          ttl: "3600", // 1 hour
        }),
      }
    );

    if (!proxyResponse.ok) {
      throw new Error("Failed to create Twilio proxy session");
    }

    const proxySession = await proxyResponse.json();

    // Add participants to the proxy session
    const addParticipant = async (phoneNumber: string, friendlyName: string) => {
      const participantResponse = await fetch(
        `https://proxy.twilio.com/v1/Services/${twilioAccountSid}/Sessions/${proxySession.sid}/Participants`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            Identifier: phoneNumber,
            FriendlyName: friendlyName,
          }),
        }
      );
      return participantResponse.json();
    };

    await addParticipant(callerProfile.phone, "Caller");
    await addParticipant(recipientProfile.phone, "Recipient");

    // Update call session with Twilio session ID
    await supabaseClient
      .from("call_sessions")
      .update({
        twilio_session_id: proxySession.sid,
        proxy_number: proxySession.phoneNumber || "+1-555-PROXY-1"
      })
      .eq("id", callSession.id);

    return new Response(JSON.stringify({
      sessionId: callSession.id,
      proxyNumber: proxySession.phoneNumber || "+1-555-PROXY-1",
      instructions: "Call this number to connect securely. Your numbers will remain private.",
      expiresAt: callSession.expires_at,
      twilioSessionId: proxySession.sid
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