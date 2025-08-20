import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-LATE-CHECKOUTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting late checkout check");

    // Create Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get current time
    const now = new Date();
    logStep("Current time", { timestamp: now.toISOString() });

    // Find all active/confirmed bookings that are 3+ hours past their end time
    // and haven't been processed yet (no existing penalty credits)
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    
    const { data: lateBookings, error: bookingsError } = await supabaseService
      .from('bookings')
      .select(`
        id, 
        renter_id, 
        end_time, 
        status,
        total_amount,
        payment_intent_id,
        parking_spots!inner(title, address, price_per_hour, owner_id)
      `)
      .in('status', ['confirmed', 'active'])
      .lte('end_time', threeHoursAgo.toISOString())
      .order('end_time', { ascending: true });

    if (bookingsError) {
      throw new Error(`Error fetching late bookings: ${bookingsError.message}`);
    }

    logStep("Found late bookings", { count: lateBookings?.length || 0 });

    if (!lateBookings || lateBookings.length === 0) {
      logStep("No late bookings found");
      return new Response(JSON.stringify({ 
        success: true,
        message: "No late bookings found",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let processedCount = 0;
    const results = [];

    for (const booking of lateBookings) {
      try {
        logStep("Processing late booking", { bookingId: booking.id, endTime: booking.end_time });

        const endTime = new Date(booking.end_time);
        const minutesLate = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60));
        
        logStep("Calculated lateness", { minutesLate, bookingId: booking.id });

        // Check if we already have a penalty credit for this booking
        const { data: existingCredit } = await supabaseService
          .from('penalty_credits')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('credit_type', 'late_checkout')
          .maybeSingle();

        if (existingCredit) {
          logStep("Penalty already exists for booking", { bookingId: booking.id });
          continue;
        }

        // Get user profile to check if this is their first offense
        const { data: profile } = await supabaseService
          .from('profiles')
          .select('failed_checkouts')
          .eq('user_id', booking.renter_id)
          .single();

        const isFirstOffense = !profile || profile.failed_checkouts === 0;

        // Calculate maximum penalty for 3-hour auto-close with two-charge approach
        const hoursLate = Math.floor(minutesLate / 60);
        const basePenalty = 20; // Maximum penalty tier
        
        // First offense leniency (20% reduction on base penalty only)
        let penaltyAmount = isFirstOffense ? basePenalty * 0.8 : basePenalty;
        penaltyAmount = Math.round(penaltyAmount * 100) / 100;
        
        // Calculate additional hourly charges for the FULL 3 hours late (separate charge)
        const hourlyRate = booking.parking_spots?.price_per_hour || 0;
        const additionalHours = 3; // Always charge for full 3 hours when auto-closing
        const additionalCharges = additionalHours * hourlyRate;
        
        logStep("Penalty calculation", { 
          minutesLate, 
          hoursLate, 
          basePenalty, 
          penaltyAmount, 
          additionalCharges,
          isFirstOffense 
        });

        // Create penalty credit for base penalty
        if (penaltyAmount > 0) {
          logStep("Creating penalty credit", { bookingId: booking.id, amount: penaltyAmount, minutesLate });

          const { data: creditData, error: creditError } = await supabaseService
            .from('penalty_credits')
            .insert({
              user_id: booking.renter_id,
              booking_id: booking.id,
              amount: penaltyAmount,
              credit_type: 'late_checkout',
              description: `Auto-close penalty - abandoned booking exactly at 3 hours late`,
              status: 'active'
            })
            .select()
            .single();

          if (creditError) {
            logStep("Error creating penalty credit", { error: creditError, bookingId: booking.id });
            continue;
          }

          // Update user profile
          const newFailedCheckouts = (profile?.failed_checkouts || 0) + 1;
          const { error: profileError } = await supabaseService
            .from('profiles')
            .update({
              failed_checkouts: newFailedCheckouts,
              last_violation_at: new Date().toISOString()
            })
            .eq('user_id', booking.renter_id);

          if (profileError) {
            logStep("Error updating profile", { error: profileError, userId: booking.renter_id });
          }

          // Always use two-charge approach for auto-close: penalty + additional hours
          try {
            logStep("Charging penalty + additional time via marketplace (two-charge approach)", { 
              bookingId: booking.id, 
              penaltyAmount, 
              additionalCharges,
              totalAmount: penaltyAmount + additionalCharges
            });
            
            const { data: paymentResult, error: paymentError } = await supabaseService.functions.invoke('create-marketplace-payment', {
              body: {
                type: 'penalty',
                bookingId: booking.id,
                amount: penaltyAmount + additionalCharges,
                description: `Auto-close: $${penaltyAmount} penalty (100% platform) + $${additionalCharges} for 3hr parking (split)`,
                penaltyBreakdown: {
                  penaltyAmount: penaltyAmount,
                  additionalAmount: additionalCharges,
                  splitPayment: true,
                  ownerId: booking.parking_spots?.owner_id,
                  isAutoClose: true
                }
              }
            });

            if (paymentError) {
              logStep("Marketplace payment failed", { error: paymentError, bookingId: booking.id });
            } else {
              logStep("Marketplace payment succeeded", { bookingId: booking.id, result: paymentResult });
            }
          } catch (paymentError) {
            logStep("Marketplace payment error", { error: paymentError, bookingId: booking.id });
          }

          results.push({
            bookingId: booking.id,
            minutesLate,
            penaltyAmount,
            additionalCharges,
            totalCharged: penaltyAmount + additionalCharges,
            status: 'auto_closed_with_penalty'
          });
        } else {
          results.push({
            bookingId: booking.id,
            minutesLate,
            status: 'auto_closed_no_penalty'
          });
        }

        // Mark booking as completed to prevent future processing
        const { error: updateError } = await supabaseService
          .from('bookings')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateError) {
          logStep("Error updating booking status", { error: updateError, bookingId: booking.id });
        } else {
          logStep("Booking marked as completed", { bookingId: booking.id });
        }

        processedCount++;

      } catch (bookingError) {
        logStep("Error processing booking", { error: bookingError, bookingId: booking.id });
        results.push({
          bookingId: booking.id,
          status: 'error',
          error: bookingError.message
        });
      }
    }

    logStep("Late checkout check completed", { processedCount, totalFound: lateBookings.length });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processed ${processedCount} late bookings`,
      processed: processedCount,
      totalFound: lateBookings.length,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-late-checkouts", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});