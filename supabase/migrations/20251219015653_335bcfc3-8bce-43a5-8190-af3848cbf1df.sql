-- Update get_available_time_slots to filter out past time slots based on spot's timezone
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_spot_id UUID,
  p_date DATE,
  p_duration_hours INTEGER DEFAULT 1,
  p_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB := '[]'::jsonb;
  slot_start TIMESTAMP;
  slot_end TIMESTAMP;
  slot_start_utc TIMESTAMPTZ;
  hour_val INTEGER;
  occupied_count INTEGER;
  total_spots_count INTEGER;
  spot_tz TEXT;
  current_time_in_spot_tz TIMESTAMP;
  is_today BOOLEAN;
BEGIN
  -- Get the spot's timezone (use this instead of user's timezone)
  SELECT COALESCE(ps.timezone, p_timezone) INTO spot_tz
  FROM parking_spots ps
  WHERE ps.id = p_spot_id;
  
  -- If spot not found, use provided timezone
  IF spot_tz IS NULL THEN
    spot_tz := p_timezone;
  END IF;

  -- Get current time in the spot's timezone
  current_time_in_spot_tz := (NOW() AT TIME ZONE spot_tz)::timestamp;
  
  -- Check if the requested date is today in the spot's timezone
  is_today := p_date = current_time_in_spot_tz::date;

  -- Get total spots for this parking location
  SELECT COALESCE(ps.total_spots, 1) INTO total_spots_count
  FROM parking_spots ps
  WHERE ps.id = p_spot_id;

  IF total_spots_count IS NULL THEN
    total_spots_count := 1;
  END IF;

  -- Generate time slots for the day (6 AM to 11 PM in the spot's timezone)
  FOR hour_val IN 6..23 LOOP
    -- Create slot timestamp in spot's timezone
    slot_start := (p_date || ' ' || LPAD(hour_val::TEXT, 2, '0') || ':00:00')::timestamp;
    slot_end := slot_start + (p_duration_hours || ' hours')::interval;
    
    -- Convert to UTC for comparison
    slot_start_utc := slot_start AT TIME ZONE spot_tz;

    -- Skip past time slots if this is today
    -- A slot is past if the slot_start time has already passed in the spot's timezone
    IF is_today AND slot_start < current_time_in_spot_tz THEN
      CONTINUE;
    END IF;

    -- Count occupied spots for this time slot using UTC times if available, otherwise local times
    SELECT COUNT(*) INTO occupied_count
    FROM bookings b
    WHERE b.spot_id = p_spot_id
      AND b.status IN ('confirmed', 'active')
      AND (
        -- Check using UTC times if available
        (b.start_time_utc IS NOT NULL AND b.end_time_utc IS NOT NULL AND
         slot_start_utc < b.end_time_utc AND 
         b.start_time_utc < (slot_end AT TIME ZONE spot_tz))
        OR
        -- Fall back to local times for older bookings
        (b.start_time_utc IS NULL AND
         slot_start < b.end_time AND 
         b.start_time < slot_end)
      );

    -- Add slot to result
    result := result || jsonb_build_object(
      'time', LPAD(hour_val::TEXT, 2, '0') || ':00',
      'available', total_spots_count - occupied_count,
      'isAvailable', (total_spots_count - occupied_count) > 0,
      'timezone', spot_tz
    );
  END LOOP;

  RETURN result::TEXT;
END;
$function$;