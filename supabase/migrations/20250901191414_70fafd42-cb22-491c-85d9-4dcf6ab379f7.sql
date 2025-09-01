-- Add function to check if spot owner is premium
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

-- Add materialized view for analytics performance
CREATE MATERIALIZED VIEW public.owner_analytics AS
SELECT 
  ps.owner_id,
  ps.id as spot_id,
  ps.title as spot_title,
  COUNT(b.id) as total_bookings,
  COALESCE(AVG(b.total_amount), 0) as avg_booking_value,
  COALESCE(SUM(b.owner_payout_amount), 0) as total_earnings,
  DATE_TRUNC('month', b.created_at) as month,
  DATE_TRUNC('week', b.created_at) as week,
  DATE_TRUNC('day', b.created_at) as day
FROM parking_spots ps
LEFT JOIN bookings b ON ps.id = b.spot_id AND b.status = 'completed'
GROUP BY ps.owner_id, ps.id, ps.title, DATE_TRUNC('month', b.created_at), DATE_TRUNC('week', b.created_at), DATE_TRUNC('day', b.created_at);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_owner_analytics_owner_month ON public.owner_analytics(owner_id, month);
CREATE INDEX IF NOT EXISTS idx_owner_analytics_owner_week ON public.owner_analytics(owner_id, week);

-- Add function to get premium fee rate
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