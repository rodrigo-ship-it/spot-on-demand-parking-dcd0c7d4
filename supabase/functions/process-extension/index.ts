import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔥 process-extension function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, extensionHours, totalAmount } = await req.json();
    console.log("📝 Extension request:", { bookingId, extensionHours, totalAmount });

    if (!bookingId || !extensionHours || !totalAmount) {
      return new Response(JSON.stringify({ error: "Missing required extension data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Create service client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    
    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select('*, parking_spots(price_per_hour, owner_id)')
      .eq('id', bookingId)
      .eq('renter_id', authData.user.id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Check availability for extension period
    const newEndTime = new Date(booking.end_time_utc);
    newEndTime.setHours(newEndTime.getHours() + extensionHours);

    const { data: conflicts } = await supabaseService
      .from('bookings')
      .select('id')
      .eq('spot_id', booking.spot_id)
      .in('status', ['confirmed', 'active'])
      .neq('id', bookingId)
      .gte('start_time_utc', booking.end_time_utc)
      .lt('start_time_utc', newEndTime.toISOString());

    if (conflicts && conflicts.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Extension unavailable",
        message: "Another booking conflicts with the requested extension time"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ 
      email: authData.user.email!, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: authData.user.email!,
      });
      customerId = customer.id;
    }

    // Create payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Parking Extension - ${extensionHours} hour(s)`,
              description: `Extension for booking ${bookingId}`,
            },
            unit_amount: Math.round(totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/bookings?extension_success=true`,
      cancel_url: `${req.headers.get("origin")}/bookings?extension_cancelled=true`,
      metadata: {
        type: "extension",
        booking_id: bookingId,
        extension_hours: extensionHours.toString(),
        new_end_time: newEndTime.toISOString(),
      },
    });

    // Update extension record with payment session
    const { error: updateError } = await supabaseService
      .from('extensions')
      .update({ 
        status: 'payment_pending',
        stripe_session_id: session.id,
        new_end_time: newEndTime.toISOString()
      })
      .eq('booking_id', bookingId)
      .eq('status', 'pending');

    if (updateError) {
      console.error("Extension update error:", updateError);
    }

    console.log("✅ Extension payment session created:", session.id);

    return new Response(JSON.stringify({ 
      success: true,
      checkout_url: session.url,
      session_id: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Extension processing error:", error);
    return new Response(JSON.stringify({ 
      error: "Extension processing failed",
      details: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});