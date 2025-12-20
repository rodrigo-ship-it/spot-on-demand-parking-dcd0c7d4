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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting late checkout check");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Current time in UTC - simple!
    const now = new Date();
    const nowUTC = now.toISOString();
    
    // 3 hours ago in UTC
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const threeHoursAgoUTC = threeHoursAgo.toISOString();
    
    logStep("Time check", { 
      nowUTC,
      threeHoursAgoUTC,
      explanation: "Looking for bookings where end_time_utc <= 3 hours ago"
    });

    // Find bookings that are late (end_time_utc is more than 3 hours ago)
    // Using end_time_utc which already accounts for the spot's timezone
    const { data: lateBookings, error: bookingsError } = await supabaseService
      .from('bookings')
      .select(`
        id, 
        renter_id, 
        start_time,
        end_time,
        start_time_utc,
        end_time_utc,
        spot_timezone,
        status,
        total_amount,
        payment_intent_id,
        parking_spots!inner(title, address, price_per_hour, owner_id, pricing_type)
      `)
      .in('status', ['confirmed', 'active'])
      .not('end_time_utc', 'is', null) // Must have UTC time
      .lte('end_time_utc', threeHoursAgoUTC)
      .order('end_time_utc', { ascending: true });

    if (bookingsError) {
      throw new Error(`Error fetching late bookings: ${bookingsError.message}`);
    }

    logStep("Found late bookings", { count: lateBookings?.length || 0 });

    if (!lateBookings || lateBookings.length === 0) {
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
        // Skip monthly bookings - they don't get late fees
        if (booking.parking_spots?.pricing_type === 'monthly') {
          logStep("Skipping monthly booking", { bookingId: booking.id });
          continue;
        }

        // Calculate how late using UTC times - simple subtraction!
        const endTimeUTC = new Date(booking.end_time_utc);
        const minutesLate = Math.floor((now.getTime() - endTimeUTC.getTime()) / (1000 * 60));
        
        logStep("Calculated lateness", { 
          bookingId: booking.id,
          endTimeUTC: booking.end_time_utc,
          spotTimezone: booking.spot_timezone,
          minutesLate,
          hoursLate: Math.floor(minutesLate / 60)
        });

        // Safety check - must be at least 3 hours late
        if (minutesLate < 180) {
          logStep("Not late enough, skipping", { bookingId: booking.id, minutesLate });
          continue;
        }

        // Check if penalty already exists
        const { data: existingCredit } = await supabaseService
          .from('penalty_credits')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('credit_type', 'late_checkout')
          .maybeSingle();

        if (existingCredit) {
          logStep("Penalty already exists", { bookingId: booking.id });
          continue;
        }

        // Get user profile for first offense check
        const { data: profile } = await supabaseService
          .from('profiles')
          .select('failed_checkouts, total_penalty_credits')
          .eq('user_id', booking.renter_id)
          .maybeSingle();

        // Calculate penalty - $20 base for 120+ min, hourly overage for FULL late time
        const basePenalty = 20.00;
        const hourlyRate = booking.parking_spots?.price_per_hour || 6.00;
        const hoursLate = Math.ceil(minutesLate / 60); // FULL late time, rounded up
        const hourlyOverage = hoursLate * hourlyRate;
        
        // Fee structure - platform gets 7% of hourly overage
        const platformFee = Math.round(hourlyOverage * 0.07 * 100) / 100;
        const stripeFee = Math.round(((hourlyOverage + basePenalty) * 0.029 + 0.30) * 100) / 100;
        const taxRate = 0.085;
        const totalOverageWithFees = Math.round((hourlyOverage + platformFee + stripeFee) * (1 + taxRate) * 100) / 100;
        
        // Total capped at $70
        let totalCharge = basePenalty + totalOverageWithFees;
        if (totalCharge > 70) totalCharge = 70;
        
        const description = `Auto-close: $${basePenalty} penalty + $${hourlyOverage.toFixed(2)} overage (${hoursLate}hr @ $${hourlyRate}/hr)`;
        
        logStep("Penalty calculation", { 
          bookingId: booking.id,
          basePenalty, 
          hourlyOverage,
          totalCharge
        });

        // Create penalty credit
        const { data: creditData, error: creditError } = await supabaseService
          .from('penalty_credits')
          .insert({
            user_id: booking.renter_id,
            booking_id: booking.id,
            amount: totalCharge,
            credit_type: 'late_checkout',
            description,
            status: 'active'
          })
          .select()
          .maybeSingle();

        if (creditError || !creditData) {
          logStep("Error creating penalty credit", { error: creditError });
          continue;
        }

        // Update user profile
        await supabaseService
          .from('profiles')
          .update({
            failed_checkouts: (profile?.failed_checkouts || 0) + 1,
            total_penalty_credits: (profile?.total_penalty_credits || 0) + totalCharge,
            last_violation_at: nowUTC
          })
          .eq('user_id', booking.renter_id);

        // Charge the penalty
        try {
          const chargeResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-marketplace-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({
              bookingId: booking.id,
              amount: totalCharge,
              description,
              penaltyCreditId: creditData.id,
              type: 'penalty',
              penaltyBreakdown: {
                penaltyFee: basePenalty,
                hourlyCharge: hourlyOverage,
                totalAmount: totalCharge
              }
            })
          });

          const chargeResult = await chargeResponse.json();
          logStep("Penalty charge result", { bookingId: booking.id, success: chargeResult.success });
        } catch (paymentError) {
          logStep("Penalty charge error", { error: paymentError.message });
        }

        // Mark booking as completed by system
        await supabaseService
          .from('bookings')
          .update({
            status: 'completed',
            completed_by_system: true,
            updated_at: nowUTC
          })
          .eq('id', booking.id);

        results.push({
          bookingId: booking.id,
          minutesLate,
          totalCharge,
          status: 'processed'
        });
        
        processedCount++;

      } catch (bookingError) {
        logStep("Error processing booking", { bookingId: booking.id, error: bookingError.message });
        results.push({ bookingId: booking.id, status: 'error', error: bookingError.message });
      }
    }

    logStep("Completed", { processedCount, totalFound: lateBookings.length });

    return new Response(JSON.stringify({ 
      success: true,
      processed: processedCount,
      totalFound: lateBookings.length,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
