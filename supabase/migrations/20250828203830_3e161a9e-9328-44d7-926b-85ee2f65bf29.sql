-- Fix timezone handling in bookings table and functions
-- Step 1: Add timezone-aware columns
ALTER TABLE public.bookings 
ADD COLUMN start_time_utc TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_time_utc TIMESTAMP WITH TIME ZONE;

-- Step 2: Update existing data assuming current timestamps are in EDT (UTC-4)
UPDATE public.bookings 
SET 
  start_time_utc = (start_time::timestamp AT TIME ZONE 'America/New_York')::timestamp with time zone,
  end_time_utc = (end_time::timestamp AT TIME ZONE 'America/New_York')::timestamp with time zone
WHERE start_time_utc IS NULL;

-- Step 3: Fix the get_available_time_slots function to handle timezones properly
CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_spot_id uuid, p_date date, p_duration_hours integer DEFAULT 1, p_timezone text DEFAULT 'America/New_York')
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      slot_time := hour_val || ':' || LPAD((minute_val * 30)::TEXT, 2, '0');
      
      -- Don't show slots that would end after 11 PM
      IF (hour_val + p_duration_hours) <= 23 THEN
        -- Create timestamps in the user's timezone for this slot
        slot_start_timestamp := (p_date || ' ' || slot_time || ':00')::timestamp AT TIME ZONE p_timezone;
        slot_end_timestamp := slot_start_timestamp + (p_duration_hours || ' hours')::interval;
        
        -- Include 30-minute grace period after booking end time
        slot_end_timestamp := slot_end_timestamp + '30 minutes'::interval;
        
        -- Count occupied spots during this time slot (only confirmed/active bookings)
        -- Use the new timezone-aware columns if available, otherwise fall back to old columns
        SELECT COUNT(*) INTO occupied_count
        FROM bookings
        WHERE spot_id = p_spot_id
          AND status IN ('confirmed', 'active')
          AND (
            -- Check new timezone-aware columns first
            (start_time_utc IS NOT NULL AND end_time_utc IS NOT NULL AND
             slot_start_timestamp < end_time_utc AND start_time_utc < slot_end_timestamp)
            OR
            -- Fallback to old columns (treat as local time in specified timezone)
            (start_time_utc IS NULL AND
             slot_start_timestamp < (start_time::timestamp AT TIME ZONE p_timezone) + '30 minutes'::interval AND 
             (start_time::timestamp AT TIME ZONE p_timezone) < slot_end_timestamp)
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
$function$;