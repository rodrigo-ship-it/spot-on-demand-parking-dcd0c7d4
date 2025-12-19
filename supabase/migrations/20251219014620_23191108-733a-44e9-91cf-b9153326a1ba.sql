-- Add timezone column to parking_spots table
ALTER TABLE public.parking_spots 
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add UTC time columns to bookings table for reliable status transitions
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS start_time_utc TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time_utc TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS spot_timezone TEXT;

-- Create index for efficient timezone-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_utc_times ON public.bookings (start_time_utc, end_time_utc);
CREATE INDEX IF NOT EXISTS idx_parking_spots_timezone ON public.parking_spots (timezone);

-- Update the get_available_time_slots function to use spot's timezone
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
  hour_val INTEGER;
  occupied_count INTEGER;
  total_spots_count INTEGER;
  spot_tz TEXT;
BEGIN
  -- Get the spot's timezone (use this instead of user's timezone)
  SELECT COALESCE(ps.timezone, p_timezone) INTO spot_tz
  FROM parking_spots ps
  WHERE ps.id = p_spot_id;
  
  -- If spot not found, use provided timezone
  IF spot_tz IS NULL THEN
    spot_tz := p_timezone;
  END IF;

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

    -- Count occupied spots for this time slot using UTC times if available, otherwise local times
    SELECT COUNT(*) INTO occupied_count
    FROM bookings b
    WHERE b.spot_id = p_spot_id
      AND b.status IN ('confirmed', 'active')
      AND (
        -- Check using UTC times if available
        (b.start_time_utc IS NOT NULL AND b.end_time_utc IS NOT NULL AND
         (slot_start AT TIME ZONE spot_tz) < b.end_time_utc AND 
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