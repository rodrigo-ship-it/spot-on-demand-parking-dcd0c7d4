// This would typically be implemented as an edge function
// For now, we'll handle payment confirmations client-side

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const handlePaymentSuccess = async (paymentIntentId: string) => {
  try {
    // Update booking status to confirmed
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntentId);

    if (error) {
      console.error('Error updating booking status:', error);
      toast.error('Payment successful but booking status update failed');
      return false;
    }

    // Send confirmation email
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('payment_intent_id', paymentIntentId)
        .single();

      if (bookingError || !booking) {
        console.error('Error fetching booking data for email:', bookingError);
        return true; // Return success anyway since payment was processed
      }

      // Get spot details
      const { data: spot, error: spotError } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('id', booking.spot_id)
        .single();

      // Get renter profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', booking.renter_id)
        .single();

      if (spotError || profileError || !spot || !profile) {
        console.error('Error fetching related data for email:', { spotError, profileError });
        return true; // Return success anyway since payment was processed
      }

      // Send confirmation email
      await supabase.functions.invoke('send-booking-confirmation', {
        body: {
          email: profile.email,
          booking: {
            id: booking.id,
            total_amount: booking.total_amount,
            start_time: booking.start_time,
            end_time: booking.end_time,
            confirmation_number: booking.id.slice(0, 8).toUpperCase()
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
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the payment success if email fails
    }

    return true;
  } catch (error) {
    console.error('Error handling payment success:', error);
    return false;
  }
};

export const handlePaymentFailure = async (paymentIntentId: string, reason: string) => {
  try {
    // Update booking status to failed
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntentId);

    if (error) {
      console.error('Error updating booking status:', error);
    }

    toast.error(`Payment failed: ${reason}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};