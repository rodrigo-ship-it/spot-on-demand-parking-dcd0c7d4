-- Fix the update_spot_availability function
CREATE OR REPLACE FUNCTION public.update_spot_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  spot_id_to_update UUID;
  occupied_spots INTEGER;
BEGIN
  -- Get the spot_id from the booking
  IF TG_OP = 'DELETE' THEN
    spot_id_to_update := OLD.spot_id;
  ELSE
    spot_id_to_update := NEW.spot_id;
  END IF;

  -- Count currently active bookings for this spot
  SELECT COUNT(*) INTO occupied_spots
  FROM bookings
  WHERE spot_id = spot_id_to_update
    AND status IN ('confirmed', 'active')
    AND start_time <= NOW()
    AND end_time > NOW();

  -- Update available spots based on total spots minus occupied spots
  UPDATE parking_spots
  SET available_spots = GREATEST(0, total_spots - occupied_spots),
      updated_at = NOW()
  WHERE id = spot_id_to_update;

  RETURN COALESCE(NEW, OLD);
END;
$function$;