-- Fix search path security warnings
CREATE OR REPLACE FUNCTION public.mask_license_plate(plate_text text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN length(plate_text) > 3 THEN 
      substring(plate_text from 1 for 2) || '***' || substring(plate_text from length(plate_text))
    ELSE '***'
  END;
$$;

CREATE OR REPLACE FUNCTION public.log_data_access(
  table_name text,
  operation text,
  record_count integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;