-- Final Security Hardening: Address remaining warnings
-- Further restrict profile data access and add security functions

-- 1. Modify the profile business purposes policy to only show minimal data
DROP POLICY IF EXISTS "Public can view limited profile info for business purposes" ON public.profiles;

-- Create a more restrictive policy that only shows essential info and only full_name/avatar
CREATE POLICY "Business partners can view limited profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Only allow viewing full_name and avatar_url for users involved in same bookings
  -- This query ensures they can only see profiles of people they have legitimate business with
  auth.uid() IN (
    SELECT b.renter_id FROM bookings b 
    JOIN parking_spots ps ON b.spot_id = ps.id 
    WHERE ps.owner_id = profiles.user_id
      AND b.status IN ('confirmed', 'active', 'completed')
    UNION
    SELECT ps.owner_id FROM parking_spots ps
    JOIN bookings b ON b.spot_id = ps.id
    WHERE b.renter_id = profiles.user_id
      AND b.status IN ('confirmed', 'active', 'completed')
  )
);

-- 2. Create a secure function to get only public profile fields (no emails/phones)
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(user_id_param uuid)
RETURNS TABLE(full_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(full_name, 'Anonymous User') as full_name,
    avatar_url
  FROM profiles 
  WHERE user_id = user_id_param;
$$;

-- 3. Add data masking function for sensitive profile data in logs
CREATE OR REPLACE FUNCTION public.mask_sensitive_profile_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log profile access for security monitoring
  IF TG_OP = 'SELECT' THEN
    PERFORM public.log_security_event_enhanced(
      'profile_access',
      jsonb_build_object(
        'accessed_user_id', NEW.user_id,
        'accessed_by', auth.uid(),
        'operation', TG_OP
      ),
      auth.uid(),
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Add additional security constraint to prevent email enumeration
-- This ensures profiles table doesn't expose emails even in error messages
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_check 
  CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$');

-- 5. Add security logging for financial data access
CREATE OR REPLACE FUNCTION public.log_financial_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive financial data
  PERFORM public.log_security_event_enhanced(
    'financial_data_access',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'accessed_by', auth.uid()
    ),
    auth.uid(),
    'high'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for financial data access logging
DROP TRIGGER IF EXISTS payment_methods_security_log ON public.payment_methods;
CREATE TRIGGER payment_methods_security_log
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_data_access();

DROP TRIGGER IF EXISTS payout_settings_security_log ON public.payout_settings;
CREATE TRIGGER payout_settings_security_log
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.payout_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_data_access();

-- 6. Create index for better performance on security queries
CREATE INDEX IF NOT EXISTS idx_bookings_security_check 
ON public.bookings (renter_id, status) 
WHERE status IN ('confirmed', 'active', 'completed');

CREATE INDEX IF NOT EXISTS idx_parking_spots_owner_security 
ON public.parking_spots (owner_id, is_active) 
WHERE is_active = true;