import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-AUTO-EXTENSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting auto-extension processing");

    // Create Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { bookingId, autoExtensionHours = 1 } = await req.json();

    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    logStep("Processing auto-extension request", { bookingId, autoExtensionHours });

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseService
      .from('bookings')
      .select(`
        id,
        renter_id,
        spot_id,
        end_time,
        end_time_utc,
        total_amount,
        status,
        parking_spots!inner(
          title,
          address,
          price_per_hour,
          owner_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message || 'Booking not found'}`);
    }

    logStep("Retrieved booking data", { 
      bookingId: booking.id, 
      status: booking.status,
      endTime: booking.end_time,
      pricePerHour: booking.parking_spots.price_per_hour
    });

    // Check if booking is eligible for auto-extension
    if (booking.status !== 'active' && booking.status !== 'confirmed') {
      throw new Error(`Booking is not active (status: ${booking.status})`);
    }

    // Get user's Stripe customer info
    const { data: userProfile } = await supabaseService
      .from('profiles')
      .select('email, full_name')  
      .eq('user_id', booking.renter_id)
      .single();

    if (!userProfile?.email) {
      throw new Error("User profile not found");
    }

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ 
      email: userProfile.email, 
      limit: 1 
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: userProfile.email,
        name: userProfile.full_name || undefined,
      });
      customerId = customer.id;
    }

    // Check premium status for both renter and lister
    const { data: renterPremium } = await supabaseService
      .from('premium_subscriptions')
      .select('id, current_period_end')
      .eq('user_id', booking.renter_id)
      .eq('status', 'active')
      .maybeSingle();
    
    const { data: listerPremium } = await supabaseService
      .from('premium_subscriptions')
      .select('id, current_period_end')
      .eq('user_id', booking.parking_spots.owner_id)
      .eq('status', 'active')
      .maybeSingle();
    
    const isRenterPremium = renterPremium && new Date(renterPremium.current_period_end) > new Date();
    const isListerPremium = listerPremium && new Date(listerPremium.current_period_end) > new Date();
    
    logStep("Premium status for auto-extension", { isRenterPremium, isListerPremium });
    
    // Calculate extension pricing with premium-aware rates
    const pricePerHour = booking.parking_spots.price_per_hour || 6;
    const basePrice = pricePerHour * autoExtensionHours;
    
    // Platform fee rates: 5% for premium, 7% for regular
    const renterPlatformFeeRate = isRenterPremium ? 0.05 : 0.07;
    const listerPlatformFeeRate = isListerPremium ? 0.05 : 0.07;
    
    // Use dynamic platform fee rate for renter
    const totalAmount = Math.round((basePrice * (1 + renterPlatformFeeRate) * 1.0875) * 100) / 100;
    
    // Calculate breakdown for platform fees
    const platformFeeFromRenter = Math.round(basePrice * renterPlatformFeeRate * 100) / 100;
    const subtotalWithPlatformFee = basePrice + platformFeeFromRenter;
    const taxAmount = Math.round(subtotalWithPlatformFee * 0.0875 * 100) / 100; // 8.75% tax
    const estimatedProcessingFee = Math.round(totalAmount * 0.029 * 100) / 100 + 0.30; // 2.9% + $0.30
    
    // Calculate platform fees for payout
    const platformFeeFromLister = Math.round(basePrice * listerPlatformFeeRate * 100) / 100;
    const totalPlatformFee = platformFeeFromRenter + platformFeeFromLister;

    logStep("Extension pricing calculated", {
      basePrice,
      totalAmount,
      renterPlatformFeeRate,
      listerPlatformFeeRate,
      platformFeeFromRenter,
      platformFeeFromLister,
      estimatedProcessingFee,
      autoExtensionHours,
      isRenterPremium,
      isListerPremium
    });

    // Create payment intent for auto-extension (immediate charge)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      description: `Auto-extension: ${autoExtensionHours} hour(s) for ${booking.parking_spots.title}`,
      payment_method_types: ["card"],
      confirm: true, // Automatically confirm the payment
      metadata: {
        booking_id: bookingId,
        extension_hours: autoExtensionHours.toString(),
        type: "auto_extension"
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed: ${paymentIntent.status}`);
    }

    logStep("Payment intent created and confirmed", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // Calculate new end time in local timezone
    const currentEndTime = new Date(booking.end_time.replace(' ', 'T'));
    const newEndTimeLocal = new Date(currentEndTime.getTime() + (autoExtensionHours * 60 * 60 * 1000));
    
    // Format as local time string for database (YYYY-MM-DD HH:MM:SS)
    const newEndTimeStr = newEndTimeLocal.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');

    // Update booking with new end time
    const { error: updateError } = await supabaseService
      .from('bookings')
      .update({
        end_time: newEndTimeStr,
        total_amount: (Number(booking.total_amount) + totalAmount),
        updated_at: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6')
      })
      .eq('id', bookingId);

    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    // Record the extension in the extensions table
    const { error: extensionError } = await supabaseService
      .from('extensions')
      .insert({
        booking_id: bookingId,
        requested_hours: autoExtensionHours,
        rate_per_hour: pricePerHour,
        total_amount: totalAmount,
        status: 'approved',
        approved_at: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6'),
        stripe_payment_intent_id: paymentIntent.id,
        new_end_time: newEndTimeStr
      });

    if (extensionError) {
      logStep("Warning: Failed to record extension", { error: extensionError });
    }

    logStep("Auto-extension completed successfully", {
      bookingId,
      newEndTime: newEndTimeLocal.toISOString(),
      totalCharged: totalAmount,
      paymentIntentId: paymentIntent.id
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Auto-extension processed: ${autoExtensionHours} hour(s) added`,
      newEndTime: newEndTimeLocal.toISOString(),
      amountCharged: totalAmount,
      paymentIntentId: paymentIntent.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-auto-extension", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});