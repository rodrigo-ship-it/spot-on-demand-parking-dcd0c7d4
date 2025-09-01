-- Create a function to safely check if spot owners are premium users
-- This bypasses RLS to check premium status without exposing sensitive data
CREATE OR REPLACE FUNCTION public.get_premium_status_for_owners(owner_ids uuid[])
RETURNS TABLE(user_id uuid, is_premium boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    owner_id as user_id,
    EXISTS (
      SELECT 1 FROM premium_subscriptions 
      WHERE premium_subscriptions.user_id = owner_id
      AND current_period_end > now()
    ) as is_premium
  FROM unnest(owner_ids) as owner_id;
END;
$$;