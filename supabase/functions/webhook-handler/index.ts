import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Processing checkout session:", session.id);

        const metadata = session.metadata;
        if (!metadata?.spot_id) {
          console.error("No spot_id in session metadata");
          break;
        }

        const bookingDetails = JSON.parse(metadata.booking_details || "{}");
        const guestDetails = JSON.parse(metadata.guest_details || "{}");
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
        
        // Calculate dates and times
        const bookingDate = new Date(bookingDetails.date).toISOString().split('T')[0];
        const startDateTime = new Date(`${bookingDate}T${bookingDetails.startTime}:00`);
        
        const endDateTime = isPricingDaily 
          ? new Date(startDateTime.getTime() + (bookingDetails.numberOfDays * 24 * 60 * 60 * 1000))
          : new Date(`${bookingDate}T${bookingDetails.endTime}:00`);

        // Create booking
        const { data: booking, error: bookingError } = await supabaseService
          .from('bookings')
          .insert({
            spot_id: metadata.spot_id,
            renter_id: metadata.user_id || null,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            total_amount: session.amount_total ? session.amount_total / 100 : 0,
            status: 'confirmed',
            payment_intent_id: session.payment_intent,
            qr_code_used: isQRBooking,
            platform_fee_amount: metadata.platform_fee ? parseFloat(metadata.platform_fee) / 100 : 0,
            owner_payout_amount: metadata.lister_amount ? parseFloat(metadata.lister_amount) / 100 : 0,
            display_date: new Date(bookingDetails.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            display_start_time: timeOptions.find(opt => opt.value === bookingDetails.startTime)?.label || bookingDetails.startTime,
            display_end_time: isPricingDaily 
              ? timeOptions.find(opt => opt.value === bookingDetails.endTime)?.label || bookingDetails.endTime
              : timeOptions.find(opt => opt.value === bookingDetails.endTime)?.label || bookingDetails.endTime,
            display_duration_text: isPricingDaily 
              ? `${bookingDetails.numberOfDays} day${bookingDetails.numberOfDays !== 1 ? 's' : ''}`
              : `${bookingDetails.duration} hour${bookingDetails.duration !== 1 ? 's' : ''}`
          })
          .select()
          .single();

        if (bookingError) {
          console.error("Error creating booking:", bookingError);
          break;
        }

        console.log("Booking created successfully:", booking.id);

        // Send confirmation email if user exists
        if (metadata.user_id) {
          try {
            const { data: profile } = await supabaseService
              .from('profiles')
              .select('*')
              .eq('user_id', metadata.user_id)
              .single();

            if (profile?.email) {
              await supabaseService.functions.invoke('send-booking-confirmation', {
                body: {
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
                    is_daily: isPricingDaily
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
                }
              });
            }
          } catch (emailError) {
            console.error("Error sending confirmation email:", emailError);
            // Don't fail the webhook if email fails
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update booking status to confirmed
        const { error } = await supabaseService
          .from("bookings")
          .update({
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", paymentIntent.id);

        if (error) {
          console.error("Error updating booking status:", error);
          return new Response("Database update failed", { status: 500 });
        }

        console.log(`Payment succeeded for booking: ${paymentIntent.metadata.booking_id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update booking status to failed
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});