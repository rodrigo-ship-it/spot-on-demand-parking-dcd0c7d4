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

    // Find all active/confirmed bookings that are 3+ hours past their END TIME IN UTC
    // This ensures we're comparing UTC to UTC, avoiding timezone confusion
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    
    const { data: lateBookings, error: bookingsError } = await supabaseService
      .from('bookings')
      .select(`
        id, 
        renter_id, 
        end_time,
        end_time_utc, 
        status,
        total_amount,
        payment_intent_id,
        parking_spots!inner(title, address, price_per_hour, owner_id)
      `)
      .in('status', ['confirmed', 'active'])
      .lte('end_time_utc', threeHoursAgo.toISOString())
      .order('end_time_utc', { ascending: true });

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
        logStep("Processing late booking", { bookingId: booking.id, endTime: booking.end_time, endTimeUtc: booking.end_time_utc });

        // Use UTC end time for accurate comparison with current UTC time
        const endTimeUtc = new Date(booking.end_time_utc);
        const minutesLate = Math.floor((now.getTime() - endTimeUtc.getTime()) / (1000 * 60));
        
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
          .maybeSingle();

        const isFirstOffense = !profile || profile.failed_checkouts === 0;

        // Calculate penalty using the SAME logic as the trigger
        const hoursLate = Math.floor(minutesLate / 60);
        let basePenalty = isFirstOffense ? 20.00 : 20.00; // Changed from 50.00 to 20.00 for repeat offenders
        
        // Calculate hourly overage charges (for hours past 3-hour grace period)
        const hourlyRate = booking.parking_spots?.price_per_hour || 6.00;
        const additionalHours = 3; // Always charge for full 3 hours when auto-closing
        const hourlyOverage = additionalHours * hourlyRate;
        
        // Apply fee structure to overage (same as regular bookings)
        const platformFeeFromOverage = Math.round(hourlyOverage * 0.07 * 100) / 100; // 7% platform fee
        const stripeProcessingFee = Math.round(((hourlyOverage + basePenalty) * 0.029 + 0.30) * 100) / 100; // 2.9% + $0.30
        
        // Calculate total with taxes
        const taxRate = 0.085; // 8.5% tax
        const totalOverageWithFees = Math.round((hourlyOverage + platformFeeFromOverage + stripeProcessingFee) * (1 + taxRate) * 100) / 100;
        
        // Owner gets 93% of base overage amount
        const ownerPayoutAmount = Math.round(hourlyOverage * 0.93 * 100) / 100;
        
        // Calculate TOTAL amount to charge user (penalty + overage + all fees)
        let totalChargeAmount = basePenalty + totalOverageWithFees;
        
        // Apply $70 cap to total charge amount
        const maxChargeAmount = 70.00;
        if (totalChargeAmount > maxChargeAmount) {
          totalChargeAmount = maxChargeAmount;
        }
        
        logStep("Penalty calculation", { 
          minutesLate, 
          hoursLate, 
          basePenalty, 
          hourlyOverage,
          platformFeeFromOverage,
          stripeProcessingFee,
          totalOverageWithFees,
          ownerPayoutAmount,
          totalChargeAmount,
          isFirstOffense 
        });

        // Create penalty credit for TOTAL amount (including all fees)
        if (totalChargeAmount > 0) {
          logStep("Creating penalty credit", { bookingId: booking.id, amount: totalChargeAmount, minutesLate });

          const penaltyDescription = `Auto-close: $${basePenalty} penalty + $${hourlyOverage} overage + fees/taxes (Total: $${totalChargeAmount})`;

          const { data: creditData, error: creditError } = await supabaseService
            .from('penalty_credits')
            .insert({
              user_id: booking.renter_id,
              booking_id: booking.id,
              amount: totalChargeAmount, // Use the total amount including all fees
              credit_type: 'late_checkout',
              description: penaltyDescription,
              status: 'active'
            })
            .select()
            .maybeSingle();

          if (creditError || !creditData) {
            logStep("Error creating penalty credit", { error: creditError, bookingId: booking.id });
            continue;
          }

          // Update user profile with total amount
          const newFailedCheckouts = (profile?.failed_checkouts || 0) + 1;
          const { error: profileError } = await supabaseService
            .from('profiles')
            .update({
              failed_checkouts: newFailedCheckouts,
              total_penalty_credits: (profile?.total_penalty_credits || 0) + totalChargeAmount,
              last_violation_at: new Date().toISOString()
            })
            .eq('user_id', booking.renter_id);

          if (profileError) {
            logStep("Error updating profile", { error: profileError, userId: booking.renter_id });
          }

          // Use the SAME payment system as manual checkout (create-marketplace-payment)
          try {
            logStep("Charging penalty using marketplace payment system", { 
              bookingId: booking.id, 
              totalAmount: totalChargeAmount,
              penaltyBreakdown: {
                penaltyFee: basePenalty,
                hourlyCharge: hourlyOverage,
                totalAmount: totalChargeAmount
              }
            });
            
            // Use direct function call with service role token (same domain)
            const chargeResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-marketplace-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
              },
              body: JSON.stringify({
                bookingId: booking.id,
                amount: totalChargeAmount,
                description: penaltyDescription,
                penaltyCreditId: creditData.id,
                type: 'penalty',
                penaltyBreakdown: {
                  penaltyFee: basePenalty,
                  hourlyCharge: hourlyOverage,
                  totalAmount: totalChargeAmount
                }
              })
            });

            const chargeResult = await chargeResponse.json();

            if (!chargeResponse.ok || !chargeResult.success) {
              logStep("Penalty charge failed", { error: chargeResult.error, bookingId: booking.id });
            } else {
              logStep("Penalty charge succeeded", { bookingId: booking.id, result: chargeResult });
            }
          } catch (paymentError) {
            logStep("Penalty charge error", { error: paymentError.message || paymentError, bookingId: booking.id });
          }

          results.push({
            bookingId: booking.id,
            minutesLate,
            basePenalty: basePenalty,
            hourlyOverage: hourlyOverage,
            totalChargeAmount: totalChargeAmount,
            status: 'auto_closed_with_penalty'
          });
        } else {
          results.push({
            bookingId: booking.id,
            minutesLate,
            status: 'auto_closed_no_penalty'
          });
        }

        // Mark booking as completed by system to trigger penalty
        const { error: updateError } = await supabaseService
          .from('bookings')
          .update({
            status: 'completed',
            completed_by_system: true,
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