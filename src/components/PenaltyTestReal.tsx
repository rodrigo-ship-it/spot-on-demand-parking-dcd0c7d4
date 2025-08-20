import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePenaltySystem } from "@/hooks/usePenaltySystem";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const PenaltyTestReal = () => {
  const { user } = useAuth();
  const { addPenaltyCredit } = usePenaltySystem(user?.id || "");
  const [processing, setProcessing] = useState(false);

  const testRealPenaltyCharge = async () => {
    setProcessing(true);
    try {
      console.log("🔥 Testing REAL penalty charge with Stripe integration");
      
      // Use the actual booking ID from the user's reservation
      const bookingId = "c2f2236c-2c34-47a9-aeb3-1d50728162dc";
      const amount = 21.00; // $12 penalty + $9 hourly
      const description = "Real test penalty: $12.00 fine + $9.00 for 1h 30m extra time";
      
      console.log("📋 Test data:", { bookingId, amount, description, user: user?.email });
      
      // Call addPenaltyCredit with autoCharge: true to trigger actual Stripe charge
      const success = await addPenaltyCredit(
        bookingId,
        amount,
        'late_checkout', 
        description,
        true, // autoCharge: true - this should charge Stripe!
        true  // splitPayment: true - penalty to platform, hourly to owner
      );
      
      if (success) {
        toast.success("Real penalty charge initiated! Check Stripe dashboard and console logs.");
      } else {
        toast.error("Penalty charge failed - check console for details");
      }
      
    } catch (error) {
      console.error("❌ Real penalty test error:", error);
      toast.error("Real penalty test failed: " + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">⚠️ REAL PENALTY CHARGE TEST</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>⚠️ WARNING:</strong> This will attempt to charge your real Stripe account $21.00!
            <br />
            <strong>Breakdown:</strong> $12 penalty fee (to platform) + $9 hourly charge (to spot owner)
            <br />
            <strong>Booking:</strong> c2f2236c-2c34-47a9-aeb3-1d50728162dc
            <br />
            <strong>User:</strong> {user?.email}
          </AlertDescription>
        </Alert>

        <Button 
          onClick={testRealPenaltyCharge}
          disabled={processing || !user}
          variant="destructive"
          className="w-full"
        >
          {processing ? "Charging Stripe..." : "🔥 TEST REAL STRIPE CHARGE ($21)"}
        </Button>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>What this test does:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Creates penalty credit in database</li>
              <li>Calls create-marketplace-payment function with type='penalty'</li>
              <li>Attempts automatic charge using your saved payment method</li>
              <li>Falls back to checkout session if automatic charge fails</li>
              <li>Splits payment: $12 to platform, $9 to spot owner</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};