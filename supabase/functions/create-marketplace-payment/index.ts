import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSeparatePenaltyCharges } from "./create-separate-penalty-charges.ts";

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
    const { spot_id, booking_details, total_amount, user_id, is_qr_booking, guest_details, bookingId, amount, description, penaltyCreditId, type, penaltyBreakdown } = await req.json();
    console.log("📝 Request data:", { spot_id, booking_details, total_amount, user_id, is_qr_booking, type, bookingId, amount, penaltyBreakdown });
    
    // Handle penalty payments differently
    if (type === 'penalty') {
      if (!bookingId || !amount || !description || !penaltyBreakdown) {
        console.log("❌ Missing penalty payment data");
        return new Response(JSON.stringify({ error: "Missing penalty payment data" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Regular booking validation
      if (!spot_id || !total_amount) {
        console.log("❌ Missing required data");
        return new Response(JSON.stringify({ error: "Missing spot_id or total_amount" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // Create client for user authentication (with anon key)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Create service client for database operations (bypass RLS)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("❌ No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    console.log("📝 Token length:", token.length);
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    console.log("📝 Auth result:", { user: data.user?.email, authError });
    if (authError || !data.user?.email) {
      console.log("❌ Authentication failed:", authError);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = data.user;
    
    // Initialize Stripe early for penalty payments
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    
    // Handle penalty payments
    if (type === 'penalty') {
      console.log("💳 Processing penalty payment");
      
      // Get booking details to find the spot and owner
      const { data: bookingData, error: bookingError } = await supabaseService
        .from('bookings')
        .select(`
          spot_id,
          parking_spots!inner(owner_id, title, address)
        `)
        .eq('id', bookingId)
        .single();
        
      if (bookingError || !bookingData) {
        console.log("❌ Booking not found for penalty:", bookingError);
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }
      
      // Get payout settings for spot owner
      const { data: payoutSettings, error: payoutError } = await supabaseService
        .from("payout_settings")
        .select("*")
        .eq("user_id", bookingData.parking_spots.owner_id)
        .maybeSingle();

      // Process penalty with payment split
      return processPenaltyPayment(stripe, user, amount, description, penaltyCreditId, payoutSettings.stripe_connect_account_id, req.headers.get("origin"), penaltyBreakdown);
    }
    
    console.log("📝 User authenticated:", user.email);

    // Get parking spot details
    console.log("📝 Getting parking spot:", spot_id);
    const { data: parkingSpot, error: spotError } = await supabaseService
      .from("parking_spots")
      .select("*")
      .eq("id", spot_id)
      .maybeSingle();

    console.log("📝 Parking spot result:", { parkingSpot, spotError });

    if (spotError || !parkingSpot) {
      console.log("❌ Parking spot not found:", { spotError, parkingSpot });
      return new Response(JSON.stringify({ error: "Parking spot not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get payout settings using service role to bypass RLS
    const { data: payoutSettings, error: payoutError } = await supabaseService
      .from("payout_settings")
      .select("*")
      .eq("user_id", parkingSpot.owner_id)
      .maybeSingle();

    if (payoutError || !payoutSettings?.stripe_connect_account_id || !payoutSettings?.payouts_enabled) {
      return new Response(JSON.stringify({ error: "Spot owner hasn't completed payout setup" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Stripe already initialized above for penalty payments

    // Calculate fees - use the total amount from the frontend
    const totalAmountCents = Math.round(parseFloat(total_amount.toString()) * 100);
    
    // Calculate base price from the spot data based on pricing type
    let baseSpotPrice = 0;
    if (parkingSpot.pricing_type === 'hourly') {
      baseSpotPrice = Math.round(parseFloat(parkingSpot.price_per_hour.toString()) * booking_details.duration * 100);
    } else if (parkingSpot.pricing_type === 'daily') {
      baseSpotPrice = Math.round(parseFloat(parkingSpot.daily_price.toString()) * booking_details.numberOfDays * 100);
    } else {
      baseSpotPrice = Math.round(parseFloat(parkingSpot.one_time_price.toString()) * 100);
    }
    
    const platformFeeFromRenter = Math.round(baseSpotPrice * 0.07);
    const platformFeeFromLister = Math.round(baseSpotPrice * 0.07);
    const totalPlatformFee = platformFeeFromRenter + platformFeeFromLister;
    const stripeProcessingFee = Math.round(totalAmountCents * 0.029) + 30;
    const listerAmount = baseSpotPrice - platformFeeFromLister - stripeProcessingFee;

    console.log("📝 Creating Stripe checkout session...");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Parking: ${parkingSpot.title}`,
            description: `${parkingSpot.address}`,
          },
          unit_amount: totalAmountCents,
        },
        quantity: 1,
      }],
      metadata: {
        spot_id: spot_id,
        owner_id: parkingSpot.owner_id,
        platform_fee: totalPlatformFee.toString(),
        lister_amount: listerAmount.toString(),
        user_id: user_id || "",
        is_qr_booking: is_qr_booking ? "true" : "false",
        booking_details: JSON.stringify(booking_details),
        guest_details: JSON.stringify(guest_details || {}),
      },
      payment_intent_data: {
        transfer_data: {
          destination: payoutSettings.stripe_connect_account_id,
          amount: listerAmount,
        },
      },
      success_url: `${req.headers.get("origin")}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/book-spot/${spot_id}`,
    });

    console.log("📝 Checkout session created successfully");

    return new Response(JSON.stringify({ 
      checkout_url: session.url,
      session_id: session.id,
      platform_fee: totalPlatformFee / 100,
      lister_amount: listerAmount / 100,
      stripe_processing_fee: stripeProcessingFee / 100,
      base_spot_price: baseSpotPrice / 100,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Function error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Payment processing failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to process penalty payments
async function processPenaltyPayment(stripe: any, user: any, amount: number, description: string, penaltyCreditId: string, connectAccountId: string | null, origin: string | null, penaltyBreakdown: any) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  
  try {
    const penaltyFeeCents = Math.round((penaltyBreakdown.penaltyFee || 0) * 100);
    const hourlyChargeCents = Math.round((penaltyBreakdown.hourlyCharge || 0) * 100);
    
    // For penalties, create 2 separate charges for clarity
    if (penaltyFeeCents > 0 && hourlyChargeCents > 0) {
      return createSeparatePenaltyCharges(stripe, user, penaltyFeeCents, hourlyChargeCents, penaltyCreditId, connectAccountId, origin);
    }
    
    // Single charge (either penalty only or hourly only)
    const totalAmountCents = penaltyFeeCents + hourlyChargeCents;
    const taxRate = 0.085; // 8.5% tax rate
    const finalAmountCents = Math.round(totalAmountCents * (1 + taxRate));
    
    // If it's penalty only, 100% to platform
    const ownerAmount = penaltyFeeCents > 0 ? 0 : (connectAccountId ? Math.round(hourlyChargeCents * 0.93) : 0);
    
    const sessionData: any = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: penaltyFeeCents > 0 ? "Parking Penalty" : "Extra Parking Time",
            description: description,
          },
          unit_amount: finalAmountCents,
        },
        quantity: 1,
      }],
      metadata: {
        type: 'penalty',
        penalty_credit_id: penaltyCreditId,
        penalty_fee: penaltyFeeCents.toString(),
        hourly_charge: hourlyChargeCents.toString(),
        total_charged: finalAmountCents.toString(),
        owner_amount: ownerAmount.toString(),
      },
      success_url: `${origin}/profile?penalty_paid=true`,
      cancel_url: `${origin}/profile`,
    };
    
    // Add transfer data only for hourly charges (not penalties)
    if (connectAccountId && ownerAmount > 0 && hourlyChargeCents > 0) {
      sessionData.payment_intent_data = {
        transfer_data: {
          destination: connectAccountId,
          amount: ownerAmount,
        },
      };
    }
    
    const session = await stripe.checkout.sessions.create(sessionData);
    
    console.log("📝 Penalty payment session created successfully");
    
    return new Response(JSON.stringify({ 
      checkout_url: session.url,
      session_id: session.id,
      success: true,
      message: "Penalty payment session created"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("❌ Penalty payment error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Penalty payment processing failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}