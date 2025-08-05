import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Shield, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentIntegrationProps {
  bookingId: string;
  amount: number;
  currency?: string;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

export const PaymentIntegration = ({ 
  bookingId, 
  amount, 
  currency = "USD",
  onPaymentSuccess,
  onPaymentError 
}: PaymentIntegrationProps) => {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: ""
  });

  const handlePayment = async () => {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
      toast.error("Please fill in all payment details");
      return;
    }

    setProcessing(true);
    
    try {
      // In a real implementation, this would integrate with Stripe
      // For demonstration, we'll simulate the payment process
      
      toast.loading("Processing payment...");
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful payment response
      const paymentData = {
        id: `pi_${Math.random().toString(36).substr(2, 9)}`,
        amount: amount * 100, // Convert to cents
        currency: currency.toLowerCase(),
        status: "succeeded",
        payment_method: paymentMethod,
        created: Date.now(),
        booking_id: bookingId
      };

      // Update booking status in database
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_intent_id: paymentData.id 
        })
        .eq('id', bookingId);

      if (updateError) {
        throw updateError;
      }

      toast.success("Payment successful!");
      onPaymentSuccess(paymentData);
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Payment failed. Please try again.");
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Amount:</span>
            <span className="text-2xl font-bold text-primary">
              ${amount.toFixed(2)} {currency}
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
              <SelectItem value="paypal" disabled>PayPal (Coming Soon)</SelectItem>
              <SelectItem value="apple_pay" disabled>Apple Pay (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Card Details Form */}
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

        {/* Security Notice */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
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
              <DollarSign className="w-5 h-5" />
              Pay ${amount.toFixed(2)}
            </div>
          )}
        </Button>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center">
          By completing this payment, you agree to our Terms of Service and Privacy Policy
        </p>
      </CardContent>
    </Card>
  );
};