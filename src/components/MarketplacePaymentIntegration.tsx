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
      console.log("🚀 [PAYMENT_FLOW_START] Starting payment process for spot:", bookingData.spotData?.id);
      console.log("🔍 [PAYMENT_DATA] Full booking data:", JSON.stringify(bookingData, null, 2));
      console.log("💰 [PAYMENT_AMOUNT] Total amount:", totalAmount);
      console.log("👤 [USER_INFO] User:", bookingData.user?.id ? 'Authenticated' : 'Guest');
      
      const paymentPayload = { 
        spot_id: bookingData.spotData?.id,
        booking_details: bookingData.bookingDetails,
        total_amount: totalAmount,
        user_id: bookingData.user?.id,
        is_qr_booking: bookingData.isQRCodeBooking,
        guest_details: bookingData.guestDetails
      };
      
      console.log("📦 [PAYMENT_PAYLOAD] Sending to edge function:", JSON.stringify(paymentPayload, null, 2));
      
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
        body: paymentPayload
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ [PAYMENT_RESPONSE_TIME] Edge function took ${responseTime}ms`);
      console.log("📝 [PAYMENT_RESPONSE] Function response:", { data, error });

      if (error) {
        console.error("❌ [PAYMENT_ERROR] Function error:", error);
        console.error("🔍 [ERROR_DETAILS] Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      // Redirect to Stripe Checkout
      if (data?.checkout_url) {
        console.log("✅ [CHECKOUT_REDIRECT] Got checkout URL, redirecting to Stripe:", data.checkout_url);
        console.log("🧾 [PAYMENT_BREAKDOWN] Fee breakdown:", {
          platformFee: data.platform_fee,
          listerAmount: data.lister_amount,
          totalAmount: data.total_amount
        });
        
        // Add a small delay to ensure logs are captured
        setTimeout(() => {
          window.location.href = data.checkout_url;
        }, 100);
        
        toast.success('Redirecting to secure payment...');
        return;
      }

      throw new Error("No checkout URL received from payment function");
      
    } catch (error: any) {
      console.error('❌ [PAYMENT_FLOW_ERROR] Error creating payment:', error);
      console.error('🔍 [ERROR_STACK] Error stack:', error.stack);
      
      // Provide specific error message for payout setup issues
      if (error.message?.includes("payout setup")) {
        console.error("💳 [PAYOUT_ERROR] Spot owner payout setup incomplete");
        toast.error("The spot owner needs to complete their payout setup before accepting bookings. Please try another spot or contact the owner.");
      } else if (error.message?.includes("Edge Function returned a non-2xx status code")) {
        console.error("🚫 [SERVICE_ERROR] Edge function returned non-2xx status");
        toast.error("Payment service temporarily unavailable. Please try again in a moment.");
      } else if (error.message?.includes("Network error") || error.message?.includes("Failed to fetch")) {
        console.error("🌐 [NETWORK_ERROR] Network connectivity issue");
        toast.error("Network error. Please check your connection and try again.");
      } else {
        console.error("⚠️ [GENERIC_ERROR] Unhandled error:", error.message);
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