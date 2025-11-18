-- Fix time format in get_available_time_slots to use leading zeros (e.g., "06:00" instead of "6:00")
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
  result TEXT := '';
  total_spots INTEGER;
  occupied_count INTEGER;
  slot_time TEXT;
  hour_val INTEGER;
  minute_val INTEGER;
  slot_start_timestamp TIMESTAMP WITH TIME ZONE;
  slot_end_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get total spots for this location
  SELECT ps.total_spots INTO total_spots
  FROM parking_spots ps
  WHERE ps.id = p_spot_id;
  
  -- Default to 1 if null
  IF total_spots IS NULL OR total_spots <= 0 THEN
    total_spots := 1;
  END IF;
  
  -- Generate JSON array of available time slots
  result := '[';
  
  -- Generate time slots from 6 AM to 10 PM in 30-minute intervals
  FOR hour_val IN 6..21 LOOP
    FOR minute_val IN 0..1 LOOP
      -- Format time with leading zeros to match frontend format (e.g., "06:00" not "6:00")
      slot_time := LPAD(hour_val::TEXT, 2, '0') || ':' || LPAD((minute_val * 30)::TEXT, 2, '0');
      
      -- Don't show slots that would end after 11 PM
      IF (hour_val + p_duration_hours) <= 23 THEN
        -- Create timestamps in the user's timezone for this slot
        slot_start_timestamp := (p_date || ' ' || slot_time || ':00')::timestamp AT TIME ZONE p_timezone;
        slot_end_timestamp := slot_start_timestamp + (p_duration_hours || ' hours')::interval;
        
        -- Count occupied spots during this time slot
        -- Use start_time and end_time (timestamp without time zone) and convert to timezone for comparison
        -- BOTH the new slot AND existing bookings need 30-minute buffers on each side
        SELECT COUNT(*) INTO occupied_count
        FROM bookings
        WHERE spot_id = p_spot_id
          AND status IN ('confirmed', 'active')
          AND start_time IS NOT NULL 
          AND end_time IS NOT NULL
          -- Convert existing booking times to the same timezone for comparison
          -- Conflict occurs if the new slot (with buffers) overlaps existing booking (with buffers)
          AND (
            -- New slot buffer start < existing booking buffer end
            (slot_start_timestamp - INTERVAL '30 minutes') < (end_time::timestamp AT TIME ZONE p_timezone + INTERVAL '30 minutes')
            AND
            -- New slot buffer end > existing booking buffer start  
            (slot_end_timestamp + INTERVAL '30 minutes') > (start_time::timestamp AT TIME ZONE p_timezone - INTERVAL '30 minutes')
          );
        
        -- Add to result
        IF result != '[' THEN
          result := result || ',';
        END IF;
        
        result := result || '{"time":"' || slot_time || '","available":' || 
                  (total_spots - occupied_count) || ',"isAvailable":' || 
                  CASE WHEN occupied_count < total_spots THEN 'true' ELSE 'false' END || '}';
      END IF;
    END LOOP;
  END LOOP;
  
  result := result || ']';
  RETURN result;
END;
$$;