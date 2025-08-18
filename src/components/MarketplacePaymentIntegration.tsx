import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarketplacePaymentProps {
  bookingData: {
    spotData: any;
    bookingDetails: any;
    user: any;
    isQRCodeBooking: boolean;
    guestDetails: any;
    timeOptions: any[];
    isPricingDaily: boolean;
  };
  totalAmount: number;
  onSuccess: () => void;
}

export const MarketplacePaymentIntegration = ({ 
  bookingData, 
  totalAmount, 
  onSuccess 
}: MarketplacePaymentProps) => {
  const [loading, setLoading] = useState(false);

  const proceedToCheckout = async () => {
    if (loading) return; // Prevent multiple calls
    
    setLoading(true);
    try {
      console.log("🚀 Starting payment process for spot:", bookingData.spotData?.id);
      console.log("🔍 Full booking data:", JSON.stringify(bookingData, null, 2));
      console.log("💰 Total amount:", totalAmount);
      
      const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
        body: { 
          spot_id: bookingData.spotData?.id,
          booking_details: bookingData.bookingDetails,
          total_amount: totalAmount,
          user_id: bookingData.user?.id,
          is_qr_booking: bookingData.isQRCodeBooking,
          guest_details: bookingData.guestDetails
        }
      });

      console.log("📝 Function response:", { data, error });

      if (error) {
        console.error("❌ Function error:", error);
        throw error;
      }

      // Redirect to Stripe Checkout
      if (data?.checkout_url) {
        console.log("✅ Got checkout URL, redirecting:", data.checkout_url);
        window.location.href = data.checkout_url; // Use direct redirect instead of new tab
        toast.success('Redirecting to payment...');
        return;
      }

      throw new Error("No checkout URL received from payment function");
      
    } catch (error: any) {
      console.error('❌ Error creating payment:', error);
      
      // Provide specific error message for payout setup issues
      if (error.message?.includes("payout setup")) {
        toast.error("The spot owner needs to complete their payout setup before accepting bookings. Please try another spot or contact the owner.");
      } else if (error.message?.includes("Edge Function returned a non-2xx status code")) {
        toast.error("Payment service temporarily unavailable. Please try again in a moment.");
      } else {
        toast.error(error.message || 'Failed to initialize payment');
      }
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
              <span className="font-bold">${(totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <Button onClick={proceedToCheckout} disabled={loading} className="w-full">
            {loading ? 'Preparing Payment...' : 'Pay with Stripe'}
          </Button>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              💡 <strong>Secure Checkout</strong><br />
              You'll be redirected to Stripe's secure payment page to complete your booking.
              The spot owner will receive an instant payout after payment confirmation.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};