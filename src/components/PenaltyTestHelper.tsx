import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PenaltyTestHelper = () => {
  const [testBooking, setTestBooking] = useState({
    spotId: "",
    startTime: "",
    endTime: "",
    totalAmount: 25.00,
  });
  
  const [createdBookingId, setCreatedBookingId] = useState("");
  const [processing, setProcessing] = useState(false);

  const createTestBooking = async () => {
    setProcessing(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Please sign in first");
        return;
      }

      // Create a test booking that's already "late"
      const now = new Date();
      const startTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
      const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);   // 1 hour ago (so it's late)

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          spot_id: testBooking.spotId,
          renter_id: user.user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_amount: testBooking.totalAmount,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedBookingId(booking.id);
      toast.success(`Test booking created! ID: ${booking.id.slice(0, 8)}...`);
      
    } catch (error) {
      console.error("Error creating test booking:", error);
      toast.error("Failed to create test booking");
    } finally {
      setProcessing(false);
    }
  };

  const simulateCheckout = async () => {
    if (!createdBookingId) {
      toast.error("Create a test booking first");
      return;
    }

    setProcessing(true);
    try {
      // Simulate the checkout process that would trigger penalties
      const verificationData = {
        timestamp: new Date().toISOString(),
        method: 'enhanced',
        locationVerified: true,
        photoVerified: true,
        timestampVerified: true,
        verificationScore: 85
      };

      // This would normally be called from the TimeManagement component
      // For testing, we'll call the edge function directly
      const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
        body: {
          type: 'penalty',
          bookingId: createdBookingId,
          amount: 36.00, // Example: $20 penalty + $16 hourly charge
          description: "Test penalty: $20.00 fine + $16.00 for 2h 0m extra time",
          penaltyBreakdown: {
            penaltyFee: 20.00,
            hourlyCharge: 16.00,
            totalAmount: 36.00
          }
        }
      });

      if (error) throw error;

      toast.success("Penalty payment session created! Check the response for checkout URL.");
      console.log("Penalty payment response:", data);
      
    } catch (error) {
      console.error("Error simulating checkout:", error);
      toast.error("Failed to simulate checkout");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>End-to-End Penalty Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This creates a real booking that's already "late" so you can test the penalty system end-to-end.
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="spotId">Parking Spot ID (must exist)</Label>
          <Input
            id="spotId"
            placeholder="Enter a valid parking spot ID"
            value={testBooking.spotId}
            onChange={(e) => setTestBooking(prev => ({ ...prev, spotId: e.target.value }))}
          />
        </div>

        <Button 
          onClick={createTestBooking} 
          disabled={processing || !testBooking.spotId}
          className="w-full"
        >
          {processing ? "Creating..." : "1. Create Test Booking (Already Late)"}
        </Button>

        {createdBookingId && (
          <Alert>
            <AlertDescription>
              <strong>Test Booking Created:</strong> {createdBookingId}
              <br />
              <small>This booking ended 1 hour ago, making it 60 minutes late.</small>
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={simulateCheckout} 
          disabled={processing || !createdBookingId}
          variant="secondary"
          className="w-full"
        >
          {processing ? "Processing..." : "2. Simulate Late Checkout"}
        </Button>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Test Steps:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Enter a valid parking spot ID from your database</li>
              <li>Click "Create Test Booking" - this makes a booking that ended 1 hour ago</li>
              <li>Click "Simulate Late Checkout" - this triggers the penalty system</li>
              <li>Check the console logs and edge function logs for payment details</li>
              <li>The system should create 2 separate charges: penalty + hourly</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};