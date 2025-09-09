-- Fix security linter issues introduced by previous migration

-- 1. Fix security definer view - Remove SECURITY DEFINER from view and make it a normal view
DROP VIEW IF EXISTS public_parking_spots;
CREATE VIEW public_parking_spots AS
SELECT 
  id, title, description, address, latitude, longitude,
  price_per_hour, one_time_price, daily_price, monthly_price,
  pricing_type, spot_type, amenities, images, total_spots,
  available_spots, rating, total_reviews, is_active,
  created_at, updated_at
FROM parking_spots
WHERE is_active = true;

-- Grant access to the public view
GRANT SELECT ON public_parking_spots TO authenticated, anon;

-- 2. Fix function search path issues - Add SET search_path to all new functions
CREATE OR REPLACE FUNCTION validate_premium_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow system updates to status, current_period_start, current_period_end, stripe fields
  -- Prevent users from updating their own subscription details directly
  IF auth.uid() = OLD.user_id AND auth.uid() IS NOT NULL THEN
    -- Users can only update non-critical fields (none currently allowed)
    RAISE EXCEPTION 'Direct subscription updates not allowed. Use Stripe Customer Portal.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION audit_sensitive_table_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive financial and personal data
  IF TG_TABLE_NAME IN ('payment_methods', 'payout_settings', 'vehicles', 'profiles') THEN
    PERFORM log_security_event_enhanced(
      'sensitive_table_access',
      jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'user_id', auth.uid(),
        'record_id', COALESCE(NEW.id, OLD.id)
      ),
      auth.uid(),
      'warning'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION validate_stripe_account_ownership(account_id text, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  -- Validate that the user owns the Stripe account
  RETURN EXISTS (
    SELECT 1 FROM payout_settings 
    WHERE user_id = user_id_param 
    AND (stripe_account_id = account_id OR stripe_connect_account_id = account_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;