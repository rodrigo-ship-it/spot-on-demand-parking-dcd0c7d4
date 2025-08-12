import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// For now, we'll use a simplified payment integration without Stripe Elements
// This can be enhanced later with full Stripe Elements integration

interface MarketplacePaymentProps {
  bookingId: string;
  totalAmount: number;
  platformFee: number;
  ownerAmount: number;
  onSuccess: () => void;
}

export const MarketplacePaymentIntegration = ({ bookingId, totalAmount, onSuccess }: { 
  bookingId: string; 
  totalAmount: number; 
  onSuccess: () => void; 
}) => {
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

      setPaymentDetails({
        platformFee: data.platform_fee,
        ownerAmount: data.owner_amount,
        client_secret: data.client_secret,
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error(error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentDetails) return;
    
    setLoading(true);
    try {
      // For now, simulate payment processing
      // In a real implementation, you would integrate with Stripe's Payment Element
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Payment successful! The spot owner will receive their payout instantly.');
      onSuccess();
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <span className="font-bold">${totalAmount.toFixed(2)}</span>
            </div>
            {paymentDetails && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span>Platform Fee (7%):</span>
                  <span>${paymentDetails.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Spot Owner Receives:</span>
                  <span className="text-green-600 font-medium">${paymentDetails.ownerAmount.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {!paymentDetails ? (
            <Button onClick={createPaymentIntent} disabled={loading} className="w-full">
              {loading ? 'Preparing Payment...' : 'Proceed to Payment'}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  💡 <strong>Marketplace Payment Ready</strong><br />
                  The spot owner will receive an instant payout of ${paymentDetails.ownerAmount.toFixed(2)} after payment confirmation.
                </p>
              </div>
              
              <Button onClick={handlePayment} disabled={loading} className="w-full">
                {loading ? 'Processing Payment...' : `Pay $${totalAmount.toFixed(2)}`}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                This is a demo of marketplace payment splitting. In production, this would integrate with Stripe Elements for secure payment processing.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};