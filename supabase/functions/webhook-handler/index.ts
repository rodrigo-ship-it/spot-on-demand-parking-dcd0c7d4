import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  console.log(`🎯 [WEBHOOK_START] ${new Date().toISOString()} - Webhook received`);
  console.log(`📋 [WEBHOOK_HEADERS] Headers:`, Object.fromEntries(req.headers.entries()));
  
  if (req.method === "OPTIONS") {
    console.log("🔄 [WEBHOOK_CORS] Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔧 [WEBHOOK_INIT] Initializing Stripe client");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    console.log(`📦 [WEBHOOK_BODY] Body length: ${body.length} characters`);
    console.log(`🔐 [WEBHOOK_SIG] Signature present: ${!!signature}`);

    // Verify webhook signature
    let event;
    try {
      console.log("🔍 [WEBHOOK_VERIFY] Verifying webhook signature...");
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
      console.log(`✅ [WEBHOOK_VERIFIED] Signature verified for event: ${event.type}`);
    } catch (err) {
      console.error("❌ [WEBHOOK_SIG_FAILED] Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log(`🚀 [WEBHOOK_PROCESSING] Processing event type: ${event.type}`);
    console.log(`📄 [EVENT_DATA] Event ID: ${event.id}, Created: ${new Date(event.created * 1000).toISOString()}`);
    console.log(`🔍 [EVENT_FULL_DATA] Full event object:`, JSON.stringify(event, null, 2));
    
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`💳 [CHECKOUT_SESSION] Processing session: ${session.id}`);
        console.log(`💰 [SESSION_AMOUNT] Amount: ${session.amount_total}, Payment Intent: ${session.payment_intent}`);
        console.log(`📋 [SESSION_METADATA] Metadata:`, session.metadata);

        const metadata = session.metadata;
        
        // Handle extension payments
        if (metadata?.type === "extension") {
          console.log(`🔄 [EXTENSION] Processing extension payment for booking: ${metadata.booking_id}`);
          
          const bookingId = metadata.booking_id;
          const extensionHours = parseInt(metadata.extension_hours);
          const newEndTime = metadata.new_end_time;

          console.log("🔄 Processing extension:", { bookingId, extensionHours, newEndTime });

          // Update booking with new end time and display fields
          const newEndTimeLocal = new Date(newEndTime);
          const displayEndTime = newEndTimeLocal.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          });
          
          const { error: bookingError } = await supabaseService
            .from('bookings')
            .update({
              end_time: new Date(newEndTime).toISOString().slice(0, -1), // Remove Z for timestamp without timezone
              end_time_utc: newEndTime,
              display_end_time: displayEndTime, // Update the display field too
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (bookingError) {
            console.error("❌ [EXTENSION_ERROR] Failed to update booking:", bookingError);
            break;
          }

          // Update extension status (look for 'pending' status since 'payment_pending' violates constraint)
          const { error: extensionError } = await supabaseService
            .from('extensions')
            .update({
              status: 'approved',
              approved_at: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent as string
            })
            .eq('booking_id', bookingId)
            .eq('status', 'pending');

          if (extensionError) {
            console.error("❌ [EXTENSION_ERROR] Failed to update extension:", extensionError);
            break;
          }

          console.log("✅ [EXTENSION_SUCCESS] Extension processed successfully");
          break;
        }
        
        // Handle regular booking payments
        if (!metadata?.spot_id) {
          console.error("❌ [CHECKOUT_ERROR] No spot_id in session metadata");
          break;
        }

        let bookingDetails;
        let guestDetails;
        
        try {
          bookingDetails = JSON.parse(metadata.booking_details || "{}");
          guestDetails = JSON.parse(metadata.guest_details || "{}");
        } catch (error) {
          console.error("❌ [CHECKOUT_ERROR] Failed to parse booking/guest details:", error);
          break;
        }
        
        const isQRBooking = metadata.is_qr_booking === "true";
        
        // Parse time options to get display labels
        const timeOptions = [];
        for (let hour = 0; hour < 24; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            timeOptions.push({ value: timeString, label: displayTime });
          }
        }

        // Get spot details
        const { data: spot, error: spotError } = await supabaseService
          .from('parking_spots')
          .select('*')
          .eq('id', metadata.spot_id)
          .single();

        if (spotError || !spot) {
          console.error("Error fetching spot:", spotError);
          break;
        }

        const isPricingDaily = spot.pricing_type === 'daily';
        const isPricingMonthly = spot.pricing_type === 'monthly';
        
        // Calculate dates and times with better error handling
        let startTimeStr, endTimeStr;
        
        try {
        console.log(`📅 [DATE_PARSING] Booking details:`, bookingDetails);
          
          // Handle premium subscription
          if (session.mode === "subscription" && session.metadata?.subscription_type === "premium_lister") {
            console.log("💎 [PREMIUM_SUB] Processing premium subscription checkout");
            
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            console.log("💎 [PREMIUM_SUB] Subscription details:", subscription);
            
            // Create or update premium subscription record
            const { error: premiumError } = await supabaseService
              .from("premium_subscriptions")
              .upsert({
                user_id: session.metadata.user_id,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id" });

            if (premiumError) {
              console.error("❌ [PREMIUM_SUB] Error creating premium subscription:", premiumError);
            } else {
              console.log("✅ [PREMIUM_SUB] Premium subscription created successfully");
            }
            break;
          }
          
          console.log(`📅 [DATE_PARSING] Booking details:`, bookingDetails);
          
          const bookingDate = new Date(bookingDetails.date);
          if (isNaN(bookingDate.getTime())) {
            throw new Error(`Invalid booking date: ${bookingDetails.date}`);
          }
          
          // Format date as YYYY-MM-DD using local timezone
          const year = bookingDate.getFullYear();
          const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
          const day = String(bookingDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          // Create local datetime strings without any timezone conversion
          startTimeStr = `${dateStr}T${bookingDetails.startTime}:00`;
          
          // Handle different pricing types
          if (isPricingMonthly) {
            // For monthly bookings, add months to the end date
            const numberOfMonths = bookingDetails.numberOfMonths || 1;
            const endDate = new Date(bookingDate);
            endDate.setMonth(endDate.getMonth() + numberOfMonths);
            
            const endYear = endDate.getFullYear();
            const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
            const endDay = String(endDate.getDate()).padStart(2, '0');
            // For monthly bookings, use same time as start (typically 00:00 for full day access)
            endTimeStr = `${endYear}-${endMonth}-${endDay}T00:00:00`;
          } else if (isPricingDaily) {
            // For daily bookings, add days to the end time string
            const endDate = new Date(bookingDate.getTime() + (bookingDetails.numberOfDays * 24 * 60 * 60 * 1000));
            const endYear = endDate.getFullYear();
            const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
            const endDay = String(endDate.getDate()).padStart(2, '0');
            endTimeStr = `${endYear}-${endMonth}-${endDay}T${bookingDetails.startTime}:00`;
          } else {
            // For hourly bookings, use the provided end time
            endTimeStr = `${dateStr}T${bookingDetails.endTime}:00`;
          }
          
          console.log(`📅 [DATE_SUCCESS] Start: ${startTimeStr}, End: ${endTimeStr}, Pricing: ${spot.pricing_type}`);
        } catch (error) {
          console.error("❌ [DATE_ERROR] Error parsing dates:", error);
          break;
        }

        // Check for overlapping bookings before creating new one
        console.log(`🔍 [OVERLAP_CHECK] Checking for overlapping bookings for spot: ${metadata.spot_id}`);
        
        const { data: hasOverlap, error: overlapError } = await supabaseService
          .rpc('check_booking_overlap', {
            p_spot_id: metadata.spot_id,
            p_start_time: startTimeStr,
            p_end_time: endTimeStr
          });
          
        if (overlapError) {
          console.error("❌ [OVERLAP_ERROR] Error checking for overlapping bookings:", overlapError);
          return new Response(JSON.stringify({ 
            error: "Failed to validate booking availability",
            details: overlapError,
            received: true 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // Return 200 to prevent retries
          });
        }
        
        if (hasOverlap) {
          console.log(`❌ [BOOKING_CONFLICT] Overlapping booking detected for spot: ${metadata.spot_id}`);
          return new Response(JSON.stringify({ 
            error: "This time slot is no longer available. Another booking overlaps with your selected time.",
            received: true 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // Return 200 to prevent retries
          });
        }
        
        console.log(`✅ [OVERLAP_CHECK_PASSED] No overlapping bookings found`);

        // Create timezone-aware UTC timestamps
        // The startTimeStr and endTimeStr are in local time (EDT), we need to convert to UTC
        const startDate = new Date(startTimeStr.split('T')[0] + 'T00:00:00');
        const endDate = new Date(endTimeStr.split('T')[0] + 'T00:00:00');
        
        if (isPricingMonthly) {
          // For monthly bookings, set to start of day (full day access)
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999); // End of the last day
        } else {
          // For hourly/daily bookings, use the specified times
          const [startHour, startMinute] = bookingDetails.startTime.split(':').map(Number);
          const [endHour, endMinute] = (isPricingDaily ? bookingDetails.startTime : bookingDetails.endTime).split(':').map(Number);
          
          startDate.setHours(startHour, startMinute, 0, 0);
          endDate.setHours(endHour, endMinute, 0, 0);
        }
        
        // Convert to UTC properly - add EDT offset (EDT is UTC-4, so add 4 hours)
        const edtOffsetMs = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
        const startTimeUTC = new Date(startDate.getTime() + edtOffsetMs).toISOString();
        const endTimeUTC = new Date(endDate.getTime() + edtOffsetMs).toISOString();

        // Create booking
        console.log(`🏗️ [BOOKING_CREATE] Creating booking for spot: ${metadata.spot_id}, user: ${metadata.user_id || 'guest'}`);
        
        const bookingData = {
          spot_id: metadata.spot_id,
          renter_id: metadata.user_id || null,
          start_time: startTimeStr,
          end_time: endTimeStr,
          start_time_utc: startTimeUTC,
          end_time_utc: endTimeUTC,
          total_amount: session.amount_total ? session.amount_total / 100 : 0,
          status: 'confirmed',
          payment_intent_id: session.payment_intent?.toString(),
          qr_code_used: isQRBooking,
          platform_fee_amount: metadata.platform_fee ? parseFloat(metadata.platform_fee) / 100 : 0,
          owner_payout_amount: metadata.lister_amount ? parseFloat(metadata.lister_amount) / 100 : 0,
          display_date: (() => {
            // Use the exact date components to avoid timezone conversion
            const bookingDate = new Date(bookingDetails.date);
            const year = bookingDate.getFullYear();
            const month = bookingDate.getMonth();
            const day = bookingDate.getDate();
            // Create a new date with explicit local components to avoid timezone issues
            const localDate = new Date(year, month, day);
            return localDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          })(),
          display_start_time: isPricingMonthly 
            ? null  // Don't show start time for monthly bookings
            : timeOptions.find(opt => opt.value === bookingDetails.startTime)?.label || bookingDetails.startTime,
          display_end_time: isPricingMonthly 
            ? null  // Don't show end time for monthly bookings
            : (isPricingDaily 
              ? timeOptions.find(opt => opt.value === bookingDetails.startTime)?.label || bookingDetails.startTime
              : timeOptions.find(opt => opt.value === bookingDetails.endTime)?.label || bookingDetails.endTime),
          display_duration_text: isPricingMonthly
            ? `${bookingDetails.numberOfMonths || 1} month${(bookingDetails.numberOfMonths || 1) !== 1 ? 's' : ''}`
            : (isPricingDaily 
              ? `${bookingDetails.numberOfDays || 1} day${(bookingDetails.numberOfDays || 1) !== 1 ? 's' : ''}`
              : `${bookingDetails.duration || 1} hour${(bookingDetails.duration || 1) !== 1 ? 's' : ''}`)
        };
        
        console.log(`💾 [BOOKING_DATA] Inserting booking data:`, bookingData);
        
        const { data: booking, error: bookingError } = await supabaseService
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();

        if (bookingError) {
          console.error("❌ [BOOKING_ERROR] Error creating booking:", bookingError);
          console.error("🔍 [BOOKING_ERROR_DETAILS] Error details:", JSON.stringify(bookingError, null, 2));
          console.error("🔍 [BOOKING_ERROR_DATA] Data that failed:", JSON.stringify(bookingData, null, 2));
          // Still return success so webhook doesn't retry
          return new Response(JSON.stringify({ 
            error: "Booking creation failed", 
            details: bookingError,
            received: true 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // Return 200 to prevent retries
          });
        }

        console.log(`✅ [BOOKING_SUCCESS] Booking created successfully: ${booking.id}`);
        console.log(`📊 [BOOKING_DETAILS] Amount: $${booking.total_amount}, Status: ${booking.status}`);

        // Send confirmation email if user exists
        if (metadata.user_id) {
          try {
            console.log(`📧 [EMAIL_START] Attempting to send confirmation email for user: ${metadata.user_id}`);
            
            const { data: profile } = await supabaseService
              .from('profiles')
              .select('*')
              .eq('user_id', metadata.user_id)
              .single();

            console.log(`👤 [PROFILE_FOUND] Profile found: ${profile ? 'Yes' : 'No'}, Email: ${profile?.email ? 'Yes' : 'No'}`);

            if (profile?.email) {
              console.log(`📨 [EMAIL_SENDING] Sending confirmation email to: ${profile.email}`);
              
              const emailPayload = {
                email: profile.email,
                booking: {
                  id: booking.id,
                  total_amount: booking.total_amount,
                  start_time: booking.start_time,
                  end_time: booking.end_time,
                  confirmation_number: booking.id.slice(0, 8).toUpperCase(),
                  display_date: booking.display_date,
                  display_start_time: booking.display_start_time,
                  display_end_time: booking.display_end_time,
                  number_of_days: bookingDetails.numberOfDays || 1,
                  number_of_months: bookingDetails.numberOfMonths || 0,
                  is_daily: isPricingDaily,
                  is_monthly: isPricingMonthly
                },
                spot: {
                  title: spot.title,
                  address: spot.address,
                  price_per_hour: spot.price_per_hour,
                  one_time_price: spot.one_time_price,
                  daily_price: spot.daily_price,
                  pricing_type: spot.pricing_type
                },
                renter: {
                  full_name: profile.full_name || 'Customer'
                }
              };
              
              await supabaseService.functions.invoke('send-booking-confirmation', {
                body: emailPayload
              });
              
              console.log(`✅ [EMAIL_SUCCESS] Confirmation email sent successfully`);
            } else {
              console.log(`⚠️ [EMAIL_SKIP] No email found for user profile`);
            }
          } catch (emailError) {
            console.error("❌ [EMAIL_ERROR] Error sending confirmation email:", emailError);
            console.error("🔍 [EMAIL_ERROR_DETAILS] Email error details:", JSON.stringify(emailError, null, 2));
            // Don't fail the webhook if email fails
          }
        } else {
          console.log(`ℹ️ [EMAIL_SKIP] No user_id provided, skipping email`);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💳 [PAYMENT_INTENT] Processing payment intent: ${paymentIntent.id}`);
        console.log(`📋 [PAYMENT_METADATA] Payment intent metadata:`, paymentIntent.metadata);
        
        // Check if this is a penalty charge payment
        if (paymentIntent.metadata?.penalty_credit_id && paymentIntent.metadata?.penalty_type) {
          console.log(`🚨 [PENALTY_PAYMENT] Processing penalty payment: ${paymentIntent.id}`);
          console.log(`📊 [PENALTY_DETAILS] Credit ID: ${paymentIntent.metadata.penalty_credit_id}, Type: ${paymentIntent.metadata.penalty_type}`);
          
          // Update penalty credit status to paid
          const { error: penaltyError } = await supabaseService
            .from("penalty_credits")
            .update({
              status: "paid",
              updated_at: new Date().toISOString()
            })
            .eq("id", paymentIntent.metadata.penalty_credit_id);

          if (penaltyError) {
            console.error("❌ [PENALTY_UPDATE_ERROR] Error updating penalty credit:", penaltyError);
          } else {
            console.log(`✅ [PENALTY_PAID] Penalty credit marked as paid: ${paymentIntent.metadata.penalty_credit_id}`);
          }
          
          // Also create a penalties record for tracking
          const { error: penaltyRecordError } = await supabaseService
            .from("penalties")
            .insert({
              user_id: paymentIntent.metadata.user_id || (
                // Try to get user ID from penalty credit
                await supabaseService
                  .from("penalty_credits")
                  .select("user_id")
                  .eq("id", paymentIntent.metadata.penalty_credit_id)
                  .single()
              ).data?.user_id,
              booking_id: paymentIntent.metadata.booking_id,
              amount: paymentIntent.amount / 100, // Convert from cents
              status: "paid",
              penalty_type: paymentIntent.metadata.penalty_type,
              description: paymentIntent.description || "Late checkout penalty",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (penaltyRecordError) {
            console.error("❌ [PENALTY_RECORD_ERROR] Error creating penalty record:", penaltyRecordError);
          } else {
            console.log(`✅ [PENALTY_RECORDED] Penalty record created for payment: ${paymentIntent.id}`);
          }
          break;
        }
        
        // If we have booking metadata, create the booking here as backup
        if (paymentIntent.metadata && Object.keys(paymentIntent.metadata).length > 0) {
          console.log(`🔄 [FALLBACK_BOOKING] Creating booking from payment_intent.succeeded event`);
          
          // Try to find existing booking first
          const { data: existingBooking } = await supabaseService
            .from("bookings")
            .select("id")
            .eq("payment_intent_id", paymentIntent.id)
            .maybeSingle();
            
          if (existingBooking) {
            console.log(`✅ [BOOKING_EXISTS] Booking already exists: ${existingBooking.id}`);
            break;
          }
          
          // If no existing booking, this might be our primary booking creation path
          // (in case checkout.session.completed is not configured)
          console.log(`🏗️ [PAYMENT_INTENT_BOOKING] No existing booking found, but payment_intent has limited metadata`);
        }
        
        // Update booking status to confirmed if it exists
        const { error } = await supabaseService
          .from("bookings")
          .update({
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("❌ [PAYMENT_UPDATE_ERROR] Error updating booking status:", error);
        } else {
          console.log(`✅ [PAYMENT_SUCCESS] Payment succeeded and booking updated for: ${paymentIntent.id}`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ [PAYMENT_FAILED] Payment intent failed: ${paymentIntent.id}`);
        
        // Check if this is a penalty charge payment failure
        if (paymentIntent.metadata?.penalty_credit_id && paymentIntent.metadata?.penalty_type) {
          console.log(`🚨 [PENALTY_PAYMENT_FAILED] Penalty payment failed: ${paymentIntent.id}`);
          
          // Update penalty credit status to failed
          const { error: penaltyError } = await supabaseService
            .from("penalty_credits")
            .update({
              status: "payment_failed",
              updated_at: new Date().toISOString()
            })
            .eq("id", paymentIntent.metadata.penalty_credit_id);

          if (penaltyError) {
            console.error("❌ [PENALTY_FAIL_UPDATE_ERROR] Error updating penalty credit:", penaltyError);
          } else {
            console.log(`❌ [PENALTY_PAYMENT_FAILED] Penalty credit marked as payment failed: ${paymentIntent.metadata.penalty_credit_id}`);
          }
          break;
        }
        
        // Update booking status to failed for regular bookings
        const { error } = await supabaseService
          .from("bookings")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("Error updating booking status:", error);
          return new Response("Database update failed", { status: 500 });
        }

        console.log(`Payment failed for booking: ${paymentIntent.metadata.booking_id}`);
        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        
        // Log successful transfer to owner with 7-day delay
        console.log(`Transfer created: ${transfer.id} for amount: ${transfer.amount} (7-day delayed payout)`);
        
        // Store transfer information in booking if metadata exists
        if (transfer.metadata?.booking_id) {
          const { error } = await supabaseService
            .from("bookings")
            .update({ 
              stripe_transfer_id: transfer.id,
              updated_at: new Date().toISOString()
            })
            .eq("id", transfer.metadata.booking_id);

          if (error) {
            console.error("Error updating booking with transfer ID:", error);
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`Dispute created: ${dispute.id} for charge: ${dispute.charge}`);
        break;
      }

      case "refund.created": {
        const refund = event.data.object as Stripe.Refund;
        console.log(`💰 [REFUND_CREATED] Refund created: ${refund.id} for payment intent: ${refund.payment_intent}`);
        console.log(`💰 [REFUND_AMOUNT] Amount: ${refund.amount} cents, Status: ${refund.status}`);
        
        // Update our refunds table if we have a booking reference
        if (refund.metadata?.booking_id) {
          const { error } = await supabaseService
            .from("refunds")
            .update({
              stripe_refund_id: refund.id,
              status: refund.status,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("booking_id", refund.metadata.booking_id);

          if (error) {
            console.error("❌ [REFUND_UPDATE_ERROR] Error updating refund status:", error);
          } else {
            console.log(`✅ [REFUND_UPDATED] Refund status updated for booking: ${refund.metadata.booking_id}`);
          }
        }
        break;
      }

      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        console.log(`💰 [REFUND_UPDATED] Refund updated: ${refund.id}, Status: ${refund.status}`);
        
        // Update our refunds table
        if (refund.metadata?.booking_id) {
          const { error } = await supabaseService
            .from("refunds")
            .update({
              status: refund.status,
              updated_at: new Date().toISOString()
            })
            .eq("stripe_refund_id", refund.id);

          if (error) {
            console.error("❌ [REFUND_UPDATE_ERROR] Error updating refund status:", error);
          } else {
            console.log(`✅ [REFUND_STATUS_UPDATED] Refund status updated to: ${refund.status}`);
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        
        // Update payout settings with latest account status
        const { error } = await supabaseService
          .from("payout_settings")
          .update({
            payouts_enabled: account.payouts_enabled,
            onboarding_completed: account.details_submitted,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_connect_account_id", account.id);

        if (error) {
          console.error("Error updating payout settings:", error);
        }
        
        console.log(`Connect account updated: ${account.id}, payouts_enabled: ${account.payouts_enabled}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`💎 [SUBSCRIPTION_UPDATED] Subscription updated: ${subscription.id}, Status: ${subscription.status}`);
        
        // Update premium subscription status
        const { error } = await supabaseService
          .from("premium_subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("❌ [SUBSCRIPTION_UPDATE_ERROR] Error updating premium subscription:", error);
        } else {
          console.log(`✅ [SUBSCRIPTION_UPDATED] Premium subscription updated: ${subscription.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`💎 [SUBSCRIPTION_DELETED] Subscription cancelled: ${subscription.id}`);
        
        // Update premium subscription status to cancelled
        const { error } = await supabaseService
          .from("premium_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("❌ [SUBSCRIPTION_DELETE_ERROR] Error updating premium subscription:", error);
        } else {
          console.log(`✅ [SUBSCRIPTION_CANCELLED] Premium subscription cancelled: ${subscription.id}`);
        }
        break;
      }

      default:
        console.log(`⚠️ [WEBHOOK_UNHANDLED] Unhandled event type: ${event.type}`);
        console.log(`🔍 [UNHANDLED_DATA] Event data:`, JSON.stringify(event.data, null, 2));
    }

    console.log(`✅ [WEBHOOK_SUCCESS] ${new Date().toISOString()} - Webhook processed successfully`);
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(`❌ [WEBHOOK_FATAL_ERROR] ${new Date().toISOString()} - Webhook handler error:`, error);
    console.error("🔍 [WEBHOOK_ERROR_STACK] Error stack:", error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});