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
    const { bookingId, extensionHours, totalAmount, basePrice, platformFee } = await req.json();
    console.log("📝 Extension request:", { bookingId, extensionHours, totalAmount, basePrice, platformFee });

    if (!bookingId || !extensionHours || !totalAmount || !basePrice) {
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

    // Get booking details with spot and owner information
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select(`
        *,
        parking_spots!inner(
          price_per_hour,
          owner_id,
          title,
          address
        )
      `)
      .eq('id', bookingId)
      .eq('renter_id', authData.user.id)
      .maybeSingle();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get payout settings for automatic transfers to spot owner
    console.log("📝 Getting payout settings for owner:", booking.parking_spots.owner_id);
    const { data: payoutSettings, error: payoutError } = await supabaseService
      .from("payout_settings")
      .select("*")
      .eq("user_id", booking.parking_spots.owner_id)
      .maybeSingle();

    console.log("📝 Payout settings:", { payoutSettings, payoutError });

    if (payoutError || !payoutSettings?.stripe_connect_account_id || !payoutSettings?.payouts_enabled) {
      return new Response(JSON.stringify({ error: "Spot owner hasn't completed payout setup for automatic transfers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check availability for extension period - calculate consistently with frontend
    const currentEndTime = new Date(booking.end_time);
    const newEndTime = new Date(currentEndTime.getTime() + (extensionHours * 60 * 60 * 1000));
    
    // Convert to UTC for database comparison (EDT is UTC-4, so add 4 hours)
    const newEndTimeUTC = new Date(newEndTime.getTime() + (4 * 60 * 60 * 1000));
    
    console.log('📅 Extension time calculation:', {
      originalEndTime: booking.end_time,
      originalEndTimeUTC: booking.end_time_utc,
      extensionHours,
      newEndTimeLocal: newEndTime.toISOString().slice(0, -1),
      newEndTimeUTC: newEndTimeUTC.toISOString()
    });

    const { data: conflicts } = await supabaseService
      .from('bookings')
      .select('id, start_time_utc, end_time_utc')
      .eq('spot_id', booking.spot_id)
      .in('status', ['confirmed', 'active'])
      .neq('id', bookingId)
      .gte('start_time_utc', booking.end_time_utc)
      .lt('start_time_utc', newEndTimeUTC.toISOString());

    console.log('🔍 Backend conflict check:', {
      spotId: booking.spot_id,
      currentEndUTC: booking.end_time_utc,
      newEndUTC: newEndTimeUTC.toISOString(),
      conflictingBookings: conflicts
    });

    if (conflicts && conflicts.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Extension unavailable",
        message: "Another booking conflicts with the requested extension time"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Calculate exact fees like regular bookings
    const totalAmountCents = Math.round(totalAmount * 100);
    const basePriceCents = Math.round(basePrice * 100);
    
    // Platform fees: 7% from renter + 7% from lister = 14% total
    const platformFeeFromRenter = Math.round(basePriceCents * 0.07);
    const platformFeeFromLister = Math.round(basePriceCents * 0.07);
    const totalPlatformFee = platformFeeFromRenter + platformFeeFromLister;
    
    // Stripe processing fee (2.9% + $0.30)
    const stripeProcessingFee = Math.round(totalAmountCents * 0.029) + 30;
    
    // Amount that goes to spot owner (base price - platform fee - processing fee)
    const listerAmount = basePriceCents - platformFeeFromLister - stripeProcessingFee;
    
    console.log("💰 Extension fee breakdown:", {
      basePriceCents,
      platformFeeFromRenter,
      platformFeeFromLister,
      stripeProcessingFee,
      listerAmount,
      totalAmountCents
    });
    // Initialize Stripe
    console.log("💳 Initializing Stripe...");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    console.log("👤 Getting/creating Stripe customer for:", authData.user.email);
    const customers = await stripe.customers.list({ 
      email: authData.user.email!, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("✅ Found existing customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: authData.user.email!,
        metadata: { user_id: authData.user.id }
      });
      customerId = customer.id;
      console.log("✅ Created new customer:", customerId);
    }

    // Create payment session with automatic transfers (same as regular bookings)
    console.log("🏪 Creating Stripe checkout session with transfers...");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      payment_method_types: ["card"],
      payment_method_options: {
        card: {
          setup_future_usage: "off_session", // Save for future automatic payments
        },
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Extension: ${booking.parking_spots.title}`,
              description: `${extensionHours} hour extension - ${booking.parking_spots.address}`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "extension",
        booking_id: bookingId,
        extension_hours: extensionHours.toString(),
        new_end_time: newEndTime.toISOString(),
        owner_id: booking.parking_spots.owner_id,
        platform_fee: totalPlatformFee.toString(),
        lister_amount: listerAmount.toString(),
      },
      payment_intent_data: {
        // Automatic transfer to spot owner (same as regular bookings)
        transfer_data: {
          destination: payoutSettings.stripe_connect_account_id,
          amount: listerAmount,
        },
        setup_future_usage: "off_session", // Save payment method for future use
      },
      success_url: `${req.headers.get("origin")}/bookings?extension_success=true`,
      cancel_url: `${req.headers.get("origin")}/bookings?extension_cancelled=true`,
    });

    // Update extension record with payment session (keep as 'pending' since 'payment_pending' violates constraint)
    const { error: updateError } = await supabaseService
      .from('extensions')
      .update({ 
        stripe_session_id: session.id,
        new_end_time: newEndTime.toISOString()
      })
      .eq('booking_id', bookingId)
      .eq('status', 'pending');

    if (updateError) {
      console.error("Extension update error:", updateError);
    }

    console.log("✅ Extension payment session created with automatic transfers:", session.id);

    return new Response(JSON.stringify({ 
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      // Return fee breakdown for transparency (same as regular bookings)
      platform_fee: totalPlatformFee / 100,
      lister_amount: listerAmount / 100,
      stripe_processing_fee: stripeProcessingFee / 100,
      base_price: basePriceCents / 100,
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