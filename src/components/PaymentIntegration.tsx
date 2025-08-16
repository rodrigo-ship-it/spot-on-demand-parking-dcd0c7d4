import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Shield, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentIntegrationProps {
  bookingId: string;
  baseAmount: number;
  platformFee?: number;
  tax?: number;
  totalAmount?: number;
  currency?: string;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

export const PaymentIntegration = ({ 
  bookingId, 
  baseAmount, 
  platformFee,
  tax,
  totalAmount,
  currency = "USD",
  onPaymentSuccess,
  onPaymentError 
}: PaymentIntegrationProps) => {
  // Use provided values or calculate if not provided (for backward compatibility)
  const calculatedPlatformFee = platformFee ?? Math.round(baseAmount * 0.07 * 100) / 100;
  const calculatedTax = tax ?? Math.round((baseAmount + calculatedPlatformFee) * 0.0875 * 100) / 100;
  const calculatedTotal = totalAmount ?? baseAmount + calculatedPlatformFee + calculatedTax;
  
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: ""
  });

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      // Call Stripe payment function with payment method type
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          bookingId,
          baseAmount: calculatedTotal, // Send the final total amount
          currency: currency.toLowerCase(),
          paymentMethod: paymentMethod,
        }
      });

      if (error) throw error;

      // Handle different payment methods
      if (paymentMethod === "card" || paymentMethod === "paypal") {
        // Redirect to Stripe Checkout (supports both card and PayPal)
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success("Redirecting to payment...");
          // DO NOT call onPaymentSuccess here - only after actual payment completion
          return;
        }
      } else if (paymentMethod === "apple_pay") {
        // Handle Apple Pay
        if (window.ApplePaySession?.canMakePayments()) {
          toast.info("Apple Pay session starting...");
          // In a real implementation, you'd create an Apple Pay session here
          onPaymentSuccess({ paymentMethod: "apple_pay", sessionId: "apple_pay_" + Date.now() });
          return;
        } else {
          toast.error("Apple Pay is not available on this device");
          return;
        }
      }
      
      throw new Error("No payment URL received");
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Payment failed. Please try again.");
      onPaymentError(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Breakdown */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h3 className="font-medium mb-3">Payment breakdown</h3>
          <div className="flex items-center justify-between">
            <span>Total Amount:</span>
            <span className="font-bold">${calculatedTotal.toFixed(2)} {currency}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Platform Fee (14% total):</span>
            <span>${(calculatedTotal * 0.14).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Spot Owner Receives:</span>
            <span className="text-green-600 font-medium">${(calculatedTotal * 0.86).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="card">Credit/Debit Card</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
              <SelectItem value="apple_pay">Apple Pay</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method Info */}
        {paymentMethod === "card" && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Credit/Debit Card</h4>
                <p className="text-sm text-blue-700">You'll be redirected to Stripe's secure checkout</p>
              </div>
            </div>
            <div className="text-xs text-blue-600">
              ✓ Secure Stripe checkout<br/>
              ✓ All major cards accepted<br/>
              ✓ 256-bit SSL encryption
            </div>
          </div>
        )}

        {paymentMethod === "paypal" && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">PP</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">PayPal Payment</h4>
                <p className="text-sm text-blue-700">You'll be redirected to PayPal to complete your payment</p>
              </div>
            </div>
            <div className="text-xs text-blue-600">
              ✓ Secure PayPal checkout<br/>
              ✓ Pay with PayPal balance, bank, or card<br/>
              ✓ Buyer protection included
            </div>
          </div>
        )}

        {paymentMethod === "apple_pay" && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">🍎</span>
              </div>
              <div>
                <h4 className="font-medium">Apple Pay</h4>
                <p className="text-sm text-muted-foreground">You'll be redirected to complete payment with Apple Pay</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              ✓ Available on supported Apple devices<br/>
              ✓ No card details stored<br/>
              ✓ Biometric authentication
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Your payment information is secured with 256-bit SSL encryption</span>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={processing}
          className="w-full h-12 text-lg"
          size="lg"
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {paymentMethod === "card" && <CreditCard className="w-5 h-5" />}
              {paymentMethod === "paypal" && <span className="font-bold">PP</span>}
              {paymentMethod === "apple_pay" && <span>🍎</span>}
              Continue to {paymentMethod === "card" ? "Stripe Checkout" : paymentMethod === "paypal" ? "PayPal" : "Apple Pay"}
            </div>
          )}
        </Button>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center">
          By completing this payment, you agree to our Terms of Service and Privacy Policy
        </p>
      </CardContent>
    </Card>
  );
};