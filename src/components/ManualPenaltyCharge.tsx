import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const ManualPenaltyCharge = () => {
  const [penaltyCreditId, setPenaltyCreditId] = useState('a9cf4600-0e90-436a-b77a-0327ae80be1c');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChargePenalty = async () => {
    if (!penaltyCreditId.trim()) {
      toast.error('Please enter a penalty credit ID');
      return;
    }

    setIsProcessing(true);
    try {
      // Get penalty credit details first
      const { data: penaltyCredit, error: fetchError } = await supabase
        .from('penalty_credits')
        .select(`
          *,
          bookings!inner(
            id,
            renter_id,
            total_amount
          )
        `)
        .eq('id', penaltyCreditId.trim())
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch penalty credit: ${fetchError.message}`);
      }

      if (penaltyCredit.status !== 'active') {
        throw new Error('Penalty credit is not active');
      }

      // Call the charge-penalty function
      const { data: chargeResult, error: chargeError } = await supabase.functions.invoke(
        'charge-penalty',
        {
          body: {
            bookingId: penaltyCredit.booking_id,
            amount: Number(penaltyCredit.amount),
            description: penaltyCredit.description,
            penaltyCreditId: penaltyCredit.id
          }
        }
      );

      if (chargeError) {
        throw new Error(`Failed to charge penalty: ${chargeError.message}`);
      }

      toast.success(`Penalty charge of $${penaltyCredit.amount} processed successfully`);
      
    } catch (error) {
      console.error('Error charging penalty:', error);
      toast.error(error.message || 'Failed to process penalty charge');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Manual Penalty Charge</CardTitle>
        <CardDescription>
          Manually trigger a Stripe charge for a specific penalty credit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="penaltyCreditId">Penalty Credit ID</Label>
          <Input
            id="penaltyCreditId"
            value={penaltyCreditId}
            onChange={(e) => setPenaltyCreditId(e.target.value)}
            placeholder="Enter penalty credit ID"
          />
        </div>
        <Button 
          onClick={handleChargePenalty}
          disabled={isProcessing || !penaltyCreditId.trim()}
          className="w-full"
        >
          {isProcessing ? "Processing Charge..." : "Charge Penalty"}
        </Button>
      </CardContent>
    </Card>
  );
};