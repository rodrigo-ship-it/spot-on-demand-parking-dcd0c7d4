CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_spot_id uuid,
  p_date date,
  p_duration_hours integer DEFAULT 1,
  p_timezone text DEFAULT 'America/New_York'
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  slot_start TIMESTAMP;
  slot_end TIMESTAMP;
  slot_start_utc TIMESTAMPTZ;
  slot_end_utc TIMESTAMPTZ;
  hour_val INTEGER;
  minute_val INTEGER;
  occupied_count INTEGER;
  total_spots_count INTEGER;
  spot_tz TEXT;
  current_time_in_spot_tz TIMESTAMP;
  is_today BOOLEAN;
  buffer_interval INTERVAL := '30 minutes';
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

  -- Generate time slots for the day (6 AM to 11 PM in 15-minute intervals)
  FOR hour_val IN 6..23 LOOP
    FOR minute_val IN 0..3 LOOP  -- 0, 1, 2, 3 -> 0, 15, 30, 45 minutes
      -- Create slot timestamp in spot's timezone (15-min intervals)
      slot_start := (p_date || ' ' || LPAD(hour_val::TEXT, 2, '0') || ':' || LPAD((minute_val * 15)::TEXT, 2, '0') || ':00')::timestamp;
      slot_end := slot_start + (p_duration_hours || ' hours')::interval;
      
      -- Convert to UTC for comparison
      slot_start_utc := slot_start AT TIME ZONE spot_tz;
      slot_end_utc := slot_end AT TIME ZONE spot_tz;

      -- Skip past time slots if this is today
      IF is_today AND slot_start < current_time_in_spot_tz THEN
        CONTINUE;
      END IF;

      -- Count occupied spots for this time slot with 30-minute buffers
      -- A booking blocks a slot if:
      -- (slot_start - buffer) < (booking_end + buffer) AND (slot_end + buffer) > (booking_start - buffer)
      SELECT COUNT(*) INTO occupied_count
      FROM bookings b
      WHERE b.spot_id = p_spot_id
        AND b.status IN ('confirmed', 'active')
        AND (
          -- Check using UTC times if available (with buffer)
          (b.start_time_utc IS NOT NULL AND b.end_time_utc IS NOT NULL AND
           (slot_start_utc - buffer_interval) < (b.end_time_utc + buffer_interval) AND 
           (slot_end_utc + buffer_interval) > (b.start_time_utc - buffer_interval))
          OR
          -- Fall back to local times for older bookings (with buffer)
          (b.start_time_utc IS NULL AND
           (slot_start - buffer_interval) < (b.end_time + buffer_interval) AND 
           (slot_end + buffer_interval) > (b.start_time - buffer_interval))
        );

      -- Add slot to result
      result := result || jsonb_build_object(
        'time', LPAD(hour_val::TEXT, 2, '0') || ':' || LPAD((minute_val * 15)::TEXT, 2, '0'),
        'available', total_spots_count - occupied_count,
        'isAvailable', (total_spots_count - occupied_count) > 0,
        'timezone', spot_tz
      );
    END LOOP;
  END LOOP;

  RETURN result::TEXT;
END;
$$;