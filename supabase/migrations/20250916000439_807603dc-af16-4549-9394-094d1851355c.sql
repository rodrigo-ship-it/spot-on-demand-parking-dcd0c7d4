-- Remove SECURITY DEFINER from refresh_analytics_views function
-- This function doesn't need SECURITY DEFINER since it only refreshes materialized views
-- and users should have appropriate permissions to refresh views they have access to

DROP FUNCTION IF EXISTS public.refresh_analytics_views();

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admins to refresh analytics views
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required to refresh analytics views';
  END IF;
  
  REFRESH MATERIALIZED VIEW daily_analytics;
  REFRESH MATERIALIZED VIEW owner_analytics;
END;
$function$;