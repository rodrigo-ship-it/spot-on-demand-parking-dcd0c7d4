-- Fix the refresh_analytics_views function
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW daily_analytics;
  REFRESH MATERIALIZED VIEW owner_analytics;
END;
$function$;