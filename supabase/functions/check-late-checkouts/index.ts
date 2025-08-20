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

    // Find all active/confirmed bookings that have passed their end time by more than 30 minutes (grace period)
    // and haven't been marked as completed yet
    const thirtyMinutesAgo = new Date(now.getTime() - (30 * 60 * 1000));
    
    const { data: lateBookings, error: bookingsError } = await supabaseService
      .from('bookings')
      .select(`
        id, 
        renter_id, 
        end_time, 
        status,
        total_amount,
        parking_spots!inner(title, address, price_per_hour)
      `)
      .in('status', ['confirmed', 'active'])
      .lt('end_time', thirtyMinutesAgo.toISOString())
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

        // Calculate penalty amount using the same logic as the penalty system
        let penaltyAmount = 0;
        if (minutesLate > 30) {
          if (minutesLate <= 60) penaltyAmount = 8;
          else if (minutesLate <= 120) penaltyAmount = 12;
          else penaltyAmount = 20;

          // First offense leniency (20% reduction)
          if (isFirstOffense) penaltyAmount *= 0.8;
          penaltyAmount = Math.round(penaltyAmount * 100) / 100;
        }

        if (penaltyAmount > 0) {
          logStep("Creating penalty credit", { bookingId: booking.id, amount: penaltyAmount, minutesLate });

          // Create penalty credit
          const { data: creditData, error: creditError } = await supabaseService
            .from('penalty_credits')
            .insert({
              user_id: booking.renter_id,
              booking_id: booking.id,
              amount: penaltyAmount,
              credit_type: 'late_checkout',
              description: `Automatic late checkout penalty - ${minutesLate} minutes late`,
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

          // Attempt automatic charging if amount is significant
          if (penaltyAmount >= 5) {
            try {
              logStep("Attempting automatic penalty charge", { bookingId: booking.id, amount: penaltyAmount });
              
              const { data: chargeResult, error: chargeError } = await supabaseService.functions.invoke('charge-penalty', {
                body: {
                  bookingId: booking.id,
                  amount: penaltyAmount,
                  description: `Automatic late checkout penalty - ${minutesLate} minutes late`,
                  penaltyCreditId: creditData.id
                }
              });

              if (chargeError) {
                logStep("Auto-charge failed", { error: chargeError, bookingId: booking.id });
              } else if (chargeResult?.success) {
                logStep("Auto-charge succeeded", { bookingId: booking.id, amount: penaltyAmount });
              } else {
                logStep("Auto-charge requires action", { bookingId: booking.id, result: chargeResult });
              }
            } catch (autoChargeError) {
              logStep("Auto-charge error", { error: autoChargeError, bookingId: booking.id });
            }
          }

          results.push({
            bookingId: booking.id,
            minutesLate,
            penaltyAmount,
            status: 'penalty_created'
          });
        }

        // Do NOT automatically mark booking as completed - let user manually check out
        // This prevents duplicate penalty processing while preserving user control
        logStep("Penalty processed, booking remains active for manual checkout", { bookingId: booking.id });

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