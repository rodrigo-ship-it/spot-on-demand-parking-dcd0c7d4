-- Remove any problematic triggers that might cause INSERT operations during SELECT
-- Check if there are any audit triggers on parking_spots table that log data access
DROP TRIGGER IF EXISTS audit_parking_spots_access ON parking_spots;

-- Remove audit function call from the secure parking functions to prevent INSERT during SELECT
CREATE OR REPLACE FUNCTION public.get_public_spot_listings()
RETURNS TABLE(id uuid, title text, description text, address text, latitude numeric, longitude numeric, price_per_hour numeric, one_time_price numeric, daily_price numeric, monthly_price numeric, pricing_type text, spot_type text, amenities text[], images text[], total_spots integer, available_spots integer, rating numeric, total_reviews integer, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Return parking spot data for public browsing WITHOUT owner information
  -- No logging to prevent INSERT operations in read-only contexts
  SELECT 
    ps.id,
    ps.title,
    ps.description,
    ps.address,
    ps.latitude,
    ps.longitude,
    ps.price_per_hour,
    ps.one_time_price,
    ps.daily_price,
    ps.monthly_price,
    ps.pricing_type,
    ps.spot_type,
    ps.amenities,
    ps.images,
    ps.total_spots,
    ps.available_spots,
    ps.rating,
    ps.total_reviews,
    ps.is_active,
    ps.created_at,
    ps.updated_at
  FROM parking_spots ps
  WHERE ps.is_active = true
  ORDER BY ps.created_at DESC;
$function$;