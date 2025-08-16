import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StripeProvider } from "./StripeProvider";
import { PaymentElementForm } from "./PaymentElement";

interface MarketplacePaymentProps {
  bookingId: string;
  totalAmount: number;
  onSuccess: () => void;
}

export const MarketplacePaymentIntegration = ({ 
  bookingId, 
  totalAmount, 
  onSuccess 
}: MarketplacePaymentProps) => {
  const [paymentDetails, setPaymentDetails] = useState<{
    platformFee: number;
    ownerAmount: number;
    client_secret: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const createPaymentIntent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;

      // If we get a checkout URL, redirect to Stripe Checkout
      if (data?.checkout_url) {
        window.open(data.checkout_url, '_blank');
        toast.success('Redirecting to payment...');
        return;
      }

      // Otherwise set payment details for inline form
      setPaymentDetails({
        platformFee: data.platform_fee,
        ownerAmount: data.lister_amount,
        client_secret: data.client_secret,
      });
      
      toast.success('Payment ready - please enter your payment details');
    } catch (error: any) {
      console.error('Error creating payment:', error);
      
      // Provide specific error message for payout setup issues
      if (error.message?.includes("payout setup")) {
        toast.error("The spot owner needs to complete their payout setup before accepting bookings. Please try another spot or contact the owner.");
      } else {
        toast.error(error.message || 'Failed to initialize payment');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Payment successful! The spot owner received their payout instantly.');
    onSuccess();
  };

  const handlePaymentError = (error: string) => {
    toast.error(`Payment failed: ${error}`);
  };

  if (!paymentDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Complete Payment
            <Badge variant="secondary">Secure Marketplace Payment</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="font-bold">${(totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={createPaymentIntent} disabled={loading} className="w-full">
              {loading ? 'Preparing Payment...' : 'Proceed to Payment'}
            </Button>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                💡 <strong>Marketplace Payment</strong><br />
                The spot owner will receive an instant payout (93% of the base price) after payment confirmation.
                Platform fee: 7% from both renter and owner.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Amount:</span>
          <span className="font-bold">${(totalAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span>Platform Fee (14% total):</span>
          <span>${(paymentDetails?.platformFee || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span>Spot Owner Receives:</span>
          <span className="text-green-600 font-medium">${(paymentDetails?.ownerAmount || 0).toFixed(2)}</span>
        </div>
      </div>

      <StripeProvider clientSecret={paymentDetails.client_secret}>
        <PaymentElementForm
          bookingId={bookingId}
          totalAmount={totalAmount}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </StripeProvider>
    </div>
  );
};