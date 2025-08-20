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
    
    // Check if customer exists, create if not
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      payment_method_types: ["card"],
      payment_method_collection: "if_required",
      payment_method_options: {
        card: {
          setup_future_usage: "off_session", // Save for future automatic payments
        },
      },
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
        setup_future_usage: "off_session", // Also save at payment intent level
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
    console.log("💳 Processing automatic penalty charge");
    
    const penaltyFeeCents = Math.round((penaltyBreakdown.penaltyFee || 0) * 100);
    const hourlyChargeCents = Math.round((penaltyBreakdown.hourlyCharge || 0) * 100);
    const totalAmountCents = penaltyFeeCents + hourlyChargeCents;
    
    // Find customer and their payment method
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for automatic charging");
    }
    
    const customerId = customers.data[0].id;
    
    // Get their saved payment methods (try multiple approaches)
    let paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 10
    });
    
    // If no attached payment methods, check if customer has a default payment method
    if (paymentMethods.data.length === 0) {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.invoice_settings?.default_payment_method) {
        const defaultPM = await stripe.paymentMethods.retrieve(customer.invoice_settings.default_payment_method);
        paymentMethods = { data: [defaultPM] };
      }
    }
    
    if (paymentMethods.data.length === 0) {
      throw new Error("No saved payment method found for automatic charging");
    }
    
    const paymentMethodId = paymentMethods.data[0].id;
    
    // Create payment intent for automatic charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: description,
      metadata: {
        type: 'penalty',
        penalty_credit_id: penaltyCreditId,
        penalty_fee: penaltyFeeCents.toString(),
        hourly_charge: hourlyChargeCents.toString(),
      },
      // Add transfer for hourly charges only (penalties stay with platform)
      ...(connectAccountId && hourlyChargeCents > 0 ? {
        transfer_data: {
          destination: connectAccountId,
          amount: Math.round(hourlyChargeCents * 0.93), // 93% to owner, 7% platform fee
        },
      } : {})
    });
    
    console.log(`💰 Penalty charged automatically: $${amount} - Status: ${paymentIntent.status}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      message: "Penalty charged automatically"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("❌ Automatic penalty charge failed:", error);
    
    // If automatic charging fails, fall back to creating a checkout session
    console.log("🔄 Falling back to checkout session");
    
    const totalAmountCents = Math.round(amount * 100);
    const taxRate = 0.085;
    const finalAmountCents = Math.round(totalAmountCents * (1 + taxRate));
    
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Parking Penalty",
              description: description,
            },
            unit_amount: finalAmountCents,
          },
          quantity: 1,
        }],
        metadata: {
          type: 'penalty',
          penalty_credit_id: penaltyCreditId,
        },
        success_url: `${origin}/profile?penalty_paid=true`,
        cancel_url: `${origin}/profile`,
      });
      
      return new Response(JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id,
        success: false,
        message: "Automatic charge failed, checkout session created",
        error: error.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (fallbackError) {
      return new Response(JSON.stringify({ 
        error: `Automatic charge failed: ${error.message}. Fallback also failed: ${fallbackError.message}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  }
}

// Helper function to create 2 separate charges for penalty + hourly
async function createSeparatePenaltyCharges(
  stripe: any, 
  user: any, 
  penaltyFeeCents: number, 
  hourlyChargeCents: number, 
  penaltyCreditId: string, 
  connectAccountId: string | null, 
  origin: string | null
) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  
  try {
    const taxRate = 0.085; // 8.5% tax rate
    
    // Charge 1: Penalty fee (100% to platform)
    const penaltyWithTax = Math.round(penaltyFeeCents * (1 + taxRate));
    
    // Charge 2: Hourly charge with platform fee (like regular booking)
    const renterPlatformFee = Math.round(hourlyChargeCents * 0.07);
    const hourlySubtotal = hourlyChargeCents + renterPlatformFee;
    const hourlyWithTax = Math.round(hourlySubtotal * (1 + taxRate));
    const ownerAmount = connectAccountId ? Math.round(hourlyChargeCents * 0.93) : 0; // 93% to owner
    
    // Create combined session with both line items
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Late Parking Penalty",
              description: `Late checkout penalty fee`,
            },
            unit_amount: penaltyWithTax,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Extra Parking Time",
              description: `Additional parking time charges`,
            },
            unit_amount: hourlyWithTax,
          },
          quantity: 1,
        }
      ],
      metadata: {
        type: 'penalty_split',
        penalty_credit_id: penaltyCreditId,
        penalty_fee: penaltyFeeCents.toString(),
        penalty_with_tax: penaltyWithTax.toString(),
        hourly_charge: hourlyChargeCents.toString(),
        hourly_with_fees_tax: hourlyWithTax.toString(),
        renter_platform_fee: renterPlatformFee.toString(),
        owner_amount: ownerAmount.toString(),
      },
      payment_intent_data: connectAccountId && ownerAmount > 0 ? {
        transfer_data: {
          destination: connectAccountId,
          amount: ownerAmount, // Only transfer the owner portion of hourly charge
        },
      } : undefined,
      success_url: `${origin}/profile?penalty_paid=true`,
      cancel_url: `${origin}/profile`,
    });
    
    console.log("📝 Split penalty payment session created successfully");
    
    return new Response(JSON.stringify({ 
      checkout_url: session.url,
      session_id: session.id,
      success: true,
      message: "Split penalty payment session created",
      breakdown: {
        penalty_charge: (penaltyWithTax / 100).toFixed(2),
        hourly_charge: (hourlyWithTax / 100).toFixed(2),
        total_user_pays: ((penaltyWithTax + hourlyWithTax) / 100).toFixed(2),
        platform_gets: ((penaltyFeeCents + renterPlatformFee + Math.round(hourlyChargeCents * 0.07)) / 100).toFixed(2),
        owner_gets: (ownerAmount / 100).toFixed(2)
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("❌ Split penalty payment error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Split penalty payment processing failed"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}