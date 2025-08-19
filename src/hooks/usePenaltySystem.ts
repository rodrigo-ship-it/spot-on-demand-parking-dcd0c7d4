import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PenaltyCredit {
  id: string;
  user_id: string;
  booking_id?: string;
  amount: number;
  credit_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  forgiven_reason?: string;
}

interface UserProfile {
  successful_checkouts: number;
  failed_checkouts: number;
  total_penalty_credits: number;
  last_violation_at: string | null;
}

export const usePenaltySystem = (userId: string) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [penaltyCredits, setPenaltyCredits] = useState<PenaltyCredit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('successful_checkouts, failed_checkouts, total_penalty_credits, last_violation_at')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch active penalty credits
      const { data: credits, error: creditsError } = await supabase
        .from('penalty_credits')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (creditsError) throw creditsError;

      setUserProfile(profile);
      setPenaltyCredits(credits || []);
    } catch (error) {
      console.error("Error fetching penalty data:", error);
      toast.error("Failed to load penalty information");
    } finally {
      setLoading(false);
    }
  };

  const calculatePenalty = (minutesLate: number, isFirstOffense: boolean, spotPricePerHour?: number): { penaltyFee: number; hourlyCharge: number; totalAmount: number } => {
    if (minutesLate <= 30) return { penaltyFee: 0, hourlyCharge: 0, totalAmount: 0 }; // Grace period

    let basePenalty = 0;
    if (minutesLate <= 60) basePenalty = 8;
    else if (minutesLate <= 120) basePenalty = 12;
    else basePenalty = 20;

    // First offense leniency (20% reduction)
    if (isFirstOffense) basePenalty *= 0.8;

    // Calculate hourly charge for extra time (if it's an hourly spot)
    let hourlyCharge = 0;
    if (spotPricePerHour && spotPricePerHour > 0) {
      const hoursLate = minutesLate / 60;
      hourlyCharge = hoursLate * spotPricePerHour;
    }

    const penaltyFee = Math.round(basePenalty * 100) / 100;
    hourlyCharge = Math.round(hourlyCharge * 100) / 100;
    const totalAmount = penaltyFee + hourlyCharge;

    return { penaltyFee, hourlyCharge, totalAmount };
  };

  const addPenaltyCredit = async (
    bookingId: string,
    amount: number,
    creditType: string,
    description: string,
    autoCharge: boolean = true,
    splitPayment: boolean = false
  ): Promise<boolean> => {
    try {
      // Add penalty credit
      const { data: creditData, error: creditError } = await supabase
        .from('penalty_credits')
        .insert({
          user_id: userId,
          booking_id: bookingId,
          amount,
          credit_type: creditType,
          description,
          status: 'active'
        })
        .select()
        .single();

      if (creditError) throw creditError;

      // Update user profile
      const newTotalCredits = (userProfile?.total_penalty_credits || 0) + amount;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          total_penalty_credits: newTotalCredits,
          last_violation_at: new Date().toISOString(),
          failed_checkouts: (userProfile?.failed_checkouts || 0) + 1
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Attempt automatic charging if enabled and amount is significant
      if (autoCharge && amount >= 5 && creditData) {
        try {
          const functionName = splitPayment ? 'create-marketplace-payment' : 'charge-penalty';
          const { data: chargeResult, error: chargeError } = await supabase.functions.invoke(functionName, {
            body: {
              bookingId,
              amount,
              description,
              penaltyCreditId: creditData.id,
              type: 'penalty',
              penaltyBreakdown: splitPayment ? {
                penaltyFee: parseFloat(description.match(/\$([0-9.]+) fine/)?.[1] || "0"),
                hourlyCharge: parseFloat(description.match(/\$([0-9.]+) for/)?.[1] || "0"),
                totalAmount: amount
              } : undefined
            }
          });

          if (chargeError) {
            console.error('Auto-charge failed:', chargeError);
            toast.error(`$${amount} penalty added to your account. Auto-charge failed - you can pay manually in your billing.`);
          } else if (chargeResult?.success) {
            toast.success(`$${amount} penalty charged successfully to your payment method.`);
          } else {
            toast.info(`$${amount} penalty added. ${chargeResult?.message || 'Payment requires authentication.'}`);
          }
        } catch (autoChargeError) {
          console.error('Auto-charge error:', autoChargeError);
          toast.error(`$${amount} penalty added to your account. Auto-charge failed - you can pay manually in your billing.`);
        }
      } else {
        // Show user-friendly notification for small amounts or when auto-charge is disabled
        if (amount === 0) {
          toast.success("No penalty applied - thanks for being understanding!");
        } else if (amount < 5) {
          toast.info(`Small $${amount} credit added to your account. No immediate payment needed.`);
        } else {
          toast.error(`$${amount} credit added to your account. You can dispute this if needed.`);
        }
      }

      await fetchUserData();
      return true;
    } catch (error) {
      console.error("Error adding penalty credit:", error);
      toast.error("Failed to process penalty. Please contact support.");
      return false;
    }
  };

  const recordSuccessfulCheckout = async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          successful_checkouts: (userProfile?.successful_checkouts || 0) + 1
        })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchUserData();
    } catch (error) {
      console.error("Error recording successful checkout:", error);
    }
  };

  const forgivePenaltyCredit = async (creditId: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('penalty_credits')
        .update({
          status: 'forgiven',
          forgiven_reason: reason
        })
        .eq('id', creditId);

      if (error) throw error;

      toast.success("Penalty credit has been forgiven!");
      await fetchUserData();
      return true;
    } catch (error) {
      console.error("Error forgiving penalty credit:", error);
      toast.error("Failed to forgive penalty credit");
      return false;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  return {
    userProfile,
    penaltyCredits,
    loading,
    calculatePenalty,
    addPenaltyCredit,
    recordSuccessfulCheckout,
    forgivePenaltyCredit,
    refreshData: fetchUserData
  };
};