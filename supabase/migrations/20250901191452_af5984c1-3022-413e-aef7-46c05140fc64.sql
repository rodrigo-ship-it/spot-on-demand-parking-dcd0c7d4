-- Add function to check if spot owner is premium (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.is_spot_owner_premium(spot_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM premium_subscriptions 
    WHERE user_id = spot_owner_id 
    AND status = 'active' 
    AND current_period_end > now()
  );
$$;

-- Add function to get premium fee rate (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.get_platform_fee_rate(user_id_param uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM premium_subscriptions 
      WHERE user_id = user_id_param 
      AND status = 'active' 
      AND current_period_end > now()
    ) THEN 0.05  -- 5% for premium users
    ELSE 0.07    -- 7% for regular users
  END;
$$;