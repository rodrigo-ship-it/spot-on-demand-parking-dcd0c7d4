import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';

interface PremiumSubscription {
  id: string;
  status: string;
  current_period_end: string;
  created_at: string;
}

export const usePremiumStatus = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkPremiumStatus = async () => {
    if (!user) {
      setIsPremium(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking premium status:', error);
        setIsPremium(false);
        setSubscription(null);
      } else if (data) {
        // Check if subscription is still valid
        const isValid = new Date(data.current_period_end) > new Date();
        setIsPremium(isValid);
        setSubscription(isValid ? data : null);
      } else {
        setIsPremium(false);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPremiumStatus();
  }, [user]);

  return {
    isPremium,
    subscription,
    loading,
    refetch: checkPremiumStatus
  };
};