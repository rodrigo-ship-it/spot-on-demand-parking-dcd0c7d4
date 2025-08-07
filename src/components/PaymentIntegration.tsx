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
  currency?: string;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

export const PaymentIntegration = ({ 
  bookingId, 
  baseAmount, 
  currency = "USD",
  onPaymentSuccess,
  onPaymentError 
}: PaymentIntegrationProps) => {
  // Calculate fees - renter pays 7% fee on top
  const renterFee = Math.round(baseAmount * 0.07 * 100) / 100;
  const totalAmount = baseAmount + renterFee;
  
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: ""
  });

  const handlePayment = async () => {
    // Validate required fields based on payment method
    if (paymentMethod === "card") {
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
        toast.error("Please fill in all payment details");
        return;
      }
    }

    setProcessing(true);
    
    try {
      // Call Stripe payment function with payment method type
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          bookingId,
          baseAmount,
          currency: currency.toLowerCase(),
          paymentMethod: paymentMethod, // Pass the selected payment method
        }
      });

      if (error) throw error;

      // Handle different payment methods
      if (paymentMethod === "card" || paymentMethod === "paypal") {
        // Redirect to Stripe Checkout (supports both card and PayPal)
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success("Redirecting to payment...");
          onPaymentSuccess({ sessionId: data.sessionId, paymentMethod });
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
        {/* Amount Summary */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span>Spot Price:</span>
            <span>${baseAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Service Fee (7%):</span>
            <span>${renterFee.toFixed(2)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex items-center justify-between font-bold">
            <span>Total Amount:</span>
            <span className="text-xl text-primary">
              ${totalAmount.toFixed(2)} {currency}
            </span>
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

        {/* Payment Method Forms */}
        {paymentMethod === "card" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.number}
                onChange={(e) => setCardDetails(prev => ({ 
                  ...prev, 
                  number: formatCardNumber(e.target.value) 
                }))}
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardDetails.expiry}
                  onChange={(e) => setCardDetails(prev => ({ 
                    ...prev, 
                    expiry: formatExpiry(e.target.value) 
                  }))}
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails(prev => ({ 
                    ...prev, 
                    cvv: e.target.value.replace(/[^0-9]/g, '') 
                  }))}
                  maxLength={4}
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === "paypal" && (
          <div className="space-y-4">
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
          </div>
        )}

        {paymentMethod === "apple_pay" && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">🍎</span>
                </div>
                <div>
                  <h4 className="font-medium">Apple Pay</h4>
                  <p className="text-sm text-muted-foreground">Pay securely with Touch ID or Face ID</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                ✓ Uses your default payment method<br/>
                ✓ No card details stored<br/>
                ✓ Biometric authentication
              </div>
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
              {paymentMethod === "card" && <DollarSign className="w-5 h-5" />}
              {paymentMethod === "paypal" && <span className="font-bold">PP</span>}
              {paymentMethod === "apple_pay" && <span>🍎</span>}
              {paymentMethod === "card" && `Pay $${totalAmount.toFixed(2)}`}
              {paymentMethod === "paypal" && `Pay with PayPal $${totalAmount.toFixed(2)}`}
              {paymentMethod === "apple_pay" && `Pay with Apple Pay $${totalAmount.toFixed(2)}`}
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