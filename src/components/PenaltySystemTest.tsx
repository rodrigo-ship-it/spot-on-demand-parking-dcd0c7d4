import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePenaltySystem } from "@/hooks/usePenaltySystem";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const PenaltySystemTest = () => {
  const { user } = useAuth();
  const { calculatePenalty, addPenaltyCredit } = usePenaltySystem(user?.id || "");
  
  const [testData, setTestData] = useState({
    minutesLate: 90,
    isFirstOffense: true,
    spotPricePerHour: 8,
    bookingId: "",
  });
  
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const handleCalculateTest = () => {
    const result = calculatePenalty(
      testData.minutesLate, 
      testData.spotPricePerHour
    );
    setCalculationResult(result);
  };

  const handleProcessPenalty = async () => {
    if (!calculationResult || !testData.bookingId) {
      toast.error("Please calculate penalty first and enter a booking ID");
      return;
    }
    
    setProcessing(true);
    try {
      const description = `Test penalty: $${calculationResult.penaltyFee} fine + $${calculationResult.hourlyCharge} for ${Math.floor(testData.minutesLate / 60)}h ${testData.minutesLate % 60}m extra time`;
      
      const success = await addPenaltyCredit(
        testData.bookingId,
        calculationResult.totalAmount,
        'late_checkout',
        description,
        false, // Don't auto-charge for test
        true   // Use payment splitting
      );
      
      if (success) {
        toast.success("Test penalty created successfully!");
      }
    } catch (error) {
      console.error("Test penalty error:", error);
      toast.error("Failed to create test penalty");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Penalty System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minutesLate">Minutes Late</Label>
            <Input
              id="minutesLate"
              type="number"
              value={testData.minutesLate}
              onChange={(e) => setTestData(prev => ({ ...prev, minutesLate: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label htmlFor="spotPrice">Spot Price Per Hour ($)</Label>
            <Input
              id="spotPrice"
              type="number"
              step="0.01"
              value={testData.spotPricePerHour}
              onChange={(e) => setTestData(prev => ({ ...prev, spotPricePerHour: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
        
        <div>
          <Label>
            <input
              type="checkbox"
              checked={testData.isFirstOffense}
              onChange={(e) => setTestData(prev => ({ ...prev, isFirstOffense: e.target.checked }))}
              className="mr-2"
            />
            First Offense (20% reduction)
          </Label>
        </div>

        <div>
          <Label htmlFor="bookingId">Booking ID (for actual processing)</Label>
          <Input
            id="bookingId"
            placeholder="Enter existing booking ID to test"
            value={testData.bookingId}
            onChange={(e) => setTestData(prev => ({ ...prev, bookingId: e.target.value }))}
          />
        </div>

        <Button onClick={handleCalculateTest} className="w-full">
          Calculate Penalty
        </Button>

        {calculationResult && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>Penalty Fee:</strong> ${calculationResult.penaltyFee}</div>
                <div><strong>Hourly Charge:</strong> ${calculationResult.hourlyCharge}</div>
                <div className="border-t pt-2">
                  <div><strong>Charge 1 - Penalty:</strong> ${calculationResult.penaltyFee} + tax = ${(calculationResult.penaltyFee * 1.085).toFixed(2)}</div>
                  <div><strong>Charge 2 - Hourly:</strong> ${calculationResult.hourlyCharge} + 7% fee + tax = ${(calculationResult.hourlyCharge * 1.07 * 1.085).toFixed(2)}</div>
                  <div className="text-lg font-bold"><strong>User Pays Total:</strong> ${((calculationResult.penaltyFee * 1.085) + (calculationResult.hourlyCharge * 1.07 * 1.085)).toFixed(2)}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {testData.minutesLate} minutes late = {Math.floor(testData.minutesLate / 60)}h {testData.minutesLate % 60}m
                </div>
                <div className="pt-2 border-t text-sm">
                  <div><strong>Platform Gets:</strong> ${(calculationResult.penaltyFee + (calculationResult.hourlyCharge * 0.07) + (calculationResult.hourlyCharge * 0.07)).toFixed(2)} + tax</div>
                  <div><strong>Owner Gets:</strong> ${(calculationResult.hourlyCharge * 0.93).toFixed(2)}</div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {calculationResult && (
          <Button 
            onClick={handleProcessPenalty} 
            disabled={processing || !testData.bookingId}
            variant="secondary"
            className="w-full"
          >
            {processing ? "Processing..." : "Test Penalty Processing"}
          </Button>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Updated Payment Structure:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Grace period: First 30 minutes are free</li>
              <li>Penalty tiers: 31-60min = $8, 61-120min = $12, 120min+ = $20</li>
              <li>First offense gets 20% reduction</li>
              <li>Hourly spots: Extra time charged at spot's hourly rate</li>
              <li><strong>User pays:</strong> Base amount + 7% platform fee + 8.5% tax</li>
              <li><strong>Platform gets:</strong> Penalty fee (100%) + 7% from both renter and owner</li>
              <li><strong>Owner gets:</strong> Hourly charge - 7% platform fee</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};