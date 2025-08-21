-- Fix critical RLS policy conflicts on profiles table
-- Remove conflicting policies and ensure only users can access their own data

-- Drop the conflicting "Authenticated users only for profiles" policy
DROP POLICY IF EXISTS "Authenticated users only for profiles" ON public.profiles;

-- Drop the redundant "Users can only access own profile data" policy 
DROP POLICY IF EXISTS "Users can only access own profile data" ON public.profiles;

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
      'user_id', auth.uid()
    ),
    auth.uid(),
    'info'
  );
END;
$$;

-- Add additional validation for sensitive operations
CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;