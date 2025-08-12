import { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentElementFormProps {
  bookingId: string;
  totalAmount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const PaymentElementForm = ({ 
  bookingId, 
  totalAmount, 
  onSuccess, 
  onError 
}: PaymentElementFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-confirmed`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else {
        // Update booking status to confirmed
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);

        if (updateError) {
          console.error('Error updating booking status:', updateError);
          toast.error('Payment successful but booking status update failed');
        }

        toast.success('Payment successful! Your booking is confirmed.');
        onSuccess();
      }
    } catch (err: any) {
      onError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="font-bold">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <PaymentElement />
          
          <Button 
            type="submit" 
            disabled={!stripe || loading} 
            className="w-full"
          >
            {loading ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};