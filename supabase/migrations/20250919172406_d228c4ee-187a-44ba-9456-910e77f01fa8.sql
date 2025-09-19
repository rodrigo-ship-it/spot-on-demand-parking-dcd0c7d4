-- Update the get_booking_spot_details function to return the correct structure with all necessary fields
DROP FUNCTION IF EXISTS get_booking_spot_details(uuid, uuid);

CREATE OR REPLACE FUNCTION get_booking_spot_details(spot_id_param uuid, booking_id_param uuid)
RETURNS TABLE(
  id uuid, 
  title text, 
  address text, 
  price_per_hour numeric, 
  one_time_price numeric,
  daily_price numeric, 
  monthly_price numeric, 
  pricing_type text,
  owner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return spot details if the user is involved in the specific booking
  RETURN QUERY
  SELECT 
    ps.id,
    ps.title,
    ps.address,
    ps.price_per_hour,
    ps.one_time_price,
    ps.daily_price,
    ps.monthly_price,
    ps.pricing_type,
    ps.owner_id
  FROM parking_spots ps
  JOIN bookings b ON b.spot_id = ps.id
  WHERE ps.id = spot_id_param 
    AND b.id = booking_id_param
    AND (
      auth.uid() = b.renter_id OR 
      auth.uid() = ps.owner_id
    );
END;
$function$;