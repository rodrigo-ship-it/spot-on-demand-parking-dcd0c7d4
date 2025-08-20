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

        // Auto-complete booking if 3+ hours (180 minutes) past end time
        const shouldAutoComplete = minutesLate >= 180;
        
        if (shouldAutoComplete) {
          logStep("Auto-completing booking after 3+ hours", { bookingId: booking.id, minutesLate });
          
          // Process auto-completion with penalty calculation via marketplace payment
          try {
            const { data: autoCompleteResult, error: autoCompleteError } = await supabaseService.functions.invoke('create-marketplace-payment', {
              body: {
                bookingId: booking.id,
                autoComplete: true,
                minutesLate: minutesLate
              }
            });

            if (autoCompleteError) {
              logStep("Error in auto-complete processing", { error: autoCompleteError, bookingId: booking.id });
              
              // Fallback: just mark as completed without penalty processing
              const { error: updateError } = await supabaseService
                .from('bookings')
                .update({
                  status: 'completed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', booking.id);

              if (updateError) {
                logStep("Error marking booking as completed", { error: updateError, bookingId: booking.id });
              } else {
                logStep("Booking marked as completed (fallback)", { bookingId: booking.id });
              }
            } else {
              logStep("Auto-completion processed successfully", { bookingId: booking.id, result: autoCompleteResult });
            }

            results.push({
              bookingId: booking.id,
              minutesLate,
              status: 'auto_completed'
            });
          } catch (error) {
            logStep("Auto-complete processing failed", { error: error, bookingId: booking.id });
            results.push({
              bookingId: booking.id,
              minutesLate,
              status: 'auto_complete_failed',
              error: error.message
            });
          }
        } else {
          logStep("Booking remains active for manual checkout", { bookingId: booking.id, minutesLate });
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