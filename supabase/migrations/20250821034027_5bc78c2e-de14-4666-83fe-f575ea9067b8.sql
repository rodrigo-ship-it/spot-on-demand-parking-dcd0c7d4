-- Fix critical RLS policy conflicts on profiles table
-- Remove conflicting policies and ensure only users can access their own data

-- Drop the conflicting "Authenticated users only for profiles" policy
DROP POLICY IF EXISTS "Authenticated users only for profiles" ON public.profiles;

-- Drop the redundant "Users can only access own profile data" policy 
DROP POLICY IF EXISTS "Users can only access own profile data" ON public.profiles;

-- Keep the specific user-owned access policies and admin access
-- The remaining policies should be:
-- 1. "Users can insert only their own profile"
-- 2. "Users can update only their own profile" 
-- 3. "Users can view only their own profile"
-- 4. "Admins can create profiles for any user"
-- 5. "Admins can view all profiles"
-- 6. "Admins can access all profiles for support"

-- Add enhanced security for financial data tables
-- Add additional protection for payment methods
CREATE POLICY "Enhanced payment method security" ON public.payment_methods
FOR SELECT USING (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL AND
  -- Only allow access during active user sessions
  extract(epoch from (now() - auth.jwt() ->> 'iat'::text)::timestamp) < 3600
);

-- Add additional protection for payout settings
CREATE POLICY "Enhanced payout settings security" ON public.payout_settings  
FOR SELECT USING (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL AND
  -- Only allow access during active user sessions
  extract(epoch from (now() - auth.jwt() ->> 'iat'::text)::timestamp) < 3600
);

-- Add function to mask sensitive data
CREATE OR REPLACE FUNCTION public.mask_license_plate(plate_text text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN length(plate_text) > 3 THEN 
      substring(plate_text from 1 for 2) || '***' || substring(plate_text from length(plate_text))
    ELSE '***'
  END;
$$;

-- Create secure view for vehicles with masked license plates for public viewing
CREATE OR REPLACE VIEW public.vehicles_public AS
SELECT 
  id,
  user_id,
  make,
  model,
  color,
  year,
  mask_license_plate(license_plate) as license_plate_masked,
  is_default,
  created_at,
  updated_at
FROM public.vehicles;

-- Add RLS for the public view
ALTER VIEW public.vehicles_public SET (security_invoker = true);

-- Enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_data_access(
  table_name text,
  operation text,
  record_count integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log data access for audit purposes
  PERFORM public.log_security_event_enhanced(
    'data_access',
    jsonb_build_object(
      'table', table_name,
      'operation', operation,
      'record_count', record_count,
      'user_id', auth.uid(),
      'session_age_seconds', extract(epoch from (now() - auth.jwt() ->> 'iat'::text)::timestamp)
    ),
    auth.uid(),
    'info'
  );
END;
$$;