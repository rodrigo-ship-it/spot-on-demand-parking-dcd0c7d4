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
    const nowUTC = now.toISOString();
    const currentTimeForDB = now.toISOString().slice(0, 19).replace('T', ' ');
    
    logStep("Current time", { 
      timestamp: nowUTC,
      currentTimeForDB: currentTimeForDB
    });

    let updatedCount = 0;
    let results = [];

    // 1. Update confirmed bookings to active when their start time has arrived
    // Use UTC times if available, otherwise fall back to local times
    const { data: confirmedBookings, error: confirmedError } = await supabaseService
      .from('bookings')
      .select('id, start_time, end_time, start_time_utc, end_time_utc, spot_timezone, status')
      .eq('status', 'confirmed');

    if (confirmedError) {
      logStep("Error fetching confirmed bookings", { error: confirmedError });
    } else if (confirmedBookings && confirmedBookings.length > 0) {
      logStep("Found confirmed bookings to check", { count: confirmedBookings.length });
      
      for (const booking of confirmedBookings) {
        // Determine if booking should be active
        let shouldActivate = false;
        let shouldStillBeActive = false;
        
        if (booking.start_time_utc && booking.end_time_utc) {
          // Use UTC times for comparison
          const startUTC = new Date(booking.start_time_utc);
          const endUTC = new Date(booking.end_time_utc);
          shouldActivate = now >= startUTC;
          shouldStillBeActive = now < endUTC;
          
          logStep("Checking booking with UTC times", { 
            bookingId: booking.id,
            startUTC: booking.start_time_utc,
            endUTC: booking.end_time_utc,
            nowUTC,
            shouldActivate,
            shouldStillBeActive
          });
        } else {
          // Fall back to local times (legacy bookings)
          shouldActivate = booking.start_time <= currentTimeForDB;
          shouldStillBeActive = booking.end_time > currentTimeForDB;
          
          logStep("Checking booking with local times (legacy)", { 
            bookingId: booking.id,
            startTime: booking.start_time,
            endTime: booking.end_time,
            currentTimeForDB,
            shouldActivate,
            shouldStillBeActive
          });
        }
        
        if (shouldActivate && shouldStillBeActive) {
          const { error: updateError } = await supabaseService
            .from('bookings')
            .update({ 
              status: 'active',
              updated_at: nowUTC
            })
            .eq('id', booking.id);

          if (updateError) {
            logStep("Error activating booking", { bookingId: booking.id, error: updateError });
          } else {
            logStep("Booking activated", { 
              bookingId: booking.id, 
              startTime: booking.start_time,
              endTime: booking.end_time,
              usedUTC: !!booking.start_time_utc
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
    }

    // NOTE: We do NOT auto-complete bookings here!
    // Bookings should only become "completed" when:
    // 1. User explicitly checks out (sets checkout_verification_method)
    // 2. Auto-closed after 3+ hours late by check-late-checkouts (sets completed_by_system = true)
    // 
    // Active bookings past their end time should stay "active" until one of the above happens.
    // The frontend will show them as "Late" based on time comparison.

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