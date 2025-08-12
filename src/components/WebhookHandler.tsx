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