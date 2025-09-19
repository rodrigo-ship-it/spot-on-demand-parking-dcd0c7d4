import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-BOOKING-STATUSES] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting booking status update");

    // Create Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const currentTimeForDB = now.toISOString().slice(0, 19).replace('T', ' ');
    
    logStep("Current time", { 
      timestamp: now.toISOString(),
      currentTimeForDB: currentTimeForDB
    });

    let updatedCount = 0;
    let results = [];

    // 1. Update confirmed bookings to active when their start time has arrived
    const { data: confirmedBookings, error: confirmedError } = await supabaseService
      .from('bookings')
      .select('id, start_time, end_time, status')
      .eq('status', 'confirmed')
      .lte('start_time', currentTimeForDB)
      .gt('end_time', currentTimeForDB); // Still within booking period

    if (confirmedError) {
      logStep("Error fetching confirmed bookings", { error: confirmedError });
    } else if (confirmedBookings && confirmedBookings.length > 0) {
      logStep("Found confirmed bookings to activate", { count: confirmedBookings.length });
      
      for (const booking of confirmedBookings) {
        const { error: updateError } = await supabaseService
          .from('bookings')
          .update({ 
            status: 'active',
            updated_at: now.toISOString()
          })
          .eq('id', booking.id);

        if (updateError) {
          logStep("Error activating booking", { bookingId: booking.id, error: updateError });
        } else {
          logStep("Booking activated", { 
            bookingId: booking.id, 
            startTime: booking.start_time,
            endTime: booking.end_time
          });
          updatedCount++;
          results.push({
            bookingId: booking.id,
            action: 'activated',
            fromStatus: 'confirmed',
            toStatus: 'active'
          });
        }
      }
    }

    // 2. Mark active bookings as completed when they've naturally ended (no penalty)
    const { data: activeBookings, error: activeError } = await supabaseService
      .from('bookings')
      .select('id, start_time, end_time, status')
      .eq('status', 'active')
      .lt('end_time', currentTimeForDB); // Past end time

    if (activeError) {
      logStep("Error fetching active bookings", { error: activeError });
    } else if (activeBookings && activeBookings.length > 0) {
      logStep("Found active bookings to complete", { count: activeBookings.length });
      
      // Calculate grace period time (15 minutes after end time)
      const gracePeriodMinutes = 15;
      const gracePeriodTime = new Date(now.getTime() - (gracePeriodMinutes * 60 * 1000));
      const gracePeriodTimeForDB = gracePeriodTime.toISOString().slice(0, 19).replace('T', ' ');
      
      for (const booking of activeBookings) {
        // Only complete bookings that are past the grace period
        if (booking.end_time <= gracePeriodTimeForDB) {
          const { error: updateError } = await supabaseService
            .from('bookings')
            .update({ 
              status: 'completed',
              updated_at: now.toISOString()
            })
            .eq('id', booking.id);

          if (updateError) {
            logStep("Error completing booking", { bookingId: booking.id, error: updateError });
          } else {
            logStep("Booking completed naturally", { 
              bookingId: booking.id, 
              endTime: booking.end_time,
              gracePeriodUsed: `${gracePeriodMinutes} minutes`
            });
            updatedCount++;
            results.push({
              bookingId: booking.id,
              action: 'completed_naturally',
              fromStatus: 'active',
              toStatus: 'completed'
            });
          }
        } else {
          logStep("Booking in grace period, not completing yet", {
            bookingId: booking.id,
            endTime: booking.end_time,
            gracePeriodEndsAt: gracePeriodTimeForDB
          });
        }
      }
    }

    logStep("Booking status update completed", { 
      updatedCount, 
      confirmedToActive: results.filter(r => r.action === 'activated').length,
      activeToCompleted: results.filter(r => r.action === 'completed_naturally').length
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Updated ${updatedCount} booking statuses`,
      updated: updatedCount,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in update-booking-statuses", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});