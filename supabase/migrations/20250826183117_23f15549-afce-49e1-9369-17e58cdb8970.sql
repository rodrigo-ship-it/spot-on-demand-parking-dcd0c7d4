-- Add debugging to get_available_time_slots function to diagnose timezone issues
CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_spot_id uuid, p_date date, p_duration_hours integer DEFAULT 1)
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
  slot_end_time TEXT;
  hour_val INTEGER;
  minute_val INTEGER;
  debug_bookings TEXT := '';
BEGIN
  -- Get total spots for this location
  SELECT ps.total_spots INTO total_spots
  FROM parking_spots ps
  WHERE ps.id = p_spot_id;
  
  -- Default to 1 if null
  IF total_spots IS NULL OR total_spots <= 0 THEN
    total_spots := 1;
  END IF;
  
  -- Debug: Log what bookings exist for this spot and date
  SELECT string_agg(
    format('ID:%s Start:%s End:%s Status:%s Date:%s', 
      id::text, 
      start_time::text, 
      end_time::text, 
      status, 
      DATE(start_time)::text
    ), '; '
  ) INTO debug_bookings
  FROM bookings 
  WHERE spot_id = p_spot_id 
    AND status IN ('confirmed', 'active');
    
  RAISE NOTICE 'TIMEZONE DEBUG - Input date: %, Spot: %, All bookings: %', p_date, p_spot_id, COALESCE(debug_bookings, 'NONE');
  
  -- Generate JSON array of available time slots
  result := '[';
  
  -- Generate time slots from 6 AM to 10 PM in 30-minute intervals
  FOR hour_val IN 6..21 LOOP
    FOR minute_val IN 0..1 LOOP
      slot_time := hour_val || ':' || LPAD((minute_val * 30)::TEXT, 2, '0');
      slot_end_time := (hour_val + p_duration_hours) || ':' || LPAD((minute_val * 30)::TEXT, 2, '0');
      
      -- Don't show slots that would end after 11 PM
      IF (hour_val + p_duration_hours) <= 23 THEN
        -- Count occupied spots during this time slot
        SELECT COUNT(*) INTO occupied_count
        FROM bookings
        WHERE spot_id = p_spot_id
          AND status IN ('confirmed', 'active')
          AND DATE(start_time) = p_date
          AND (
            -- Extract time components directly (no timezone conversion)
            EXTRACT(HOUR FROM start_time) * 60 + 
            EXTRACT(MINUTE FROM start_time) < 
            (hour_val + p_duration_hours) * 60 + (minute_val * 30) + 30
            AND
            EXTRACT(HOUR FROM end_time) * 60 + 
            EXTRACT(MINUTE FROM end_time) + 30 > 
            hour_val * 60 + (minute_val * 30)
          );
          
        -- Debug logging for specific problematic times
        IF hour_val = 14 OR hour_val = 15 OR hour_val = 16 THEN
          RAISE NOTICE 'TIMEZONE DEBUG - Slot %:% (hour %), occupied_count: %, checking date: %', 
            hour_val, LPAD((minute_val * 30)::TEXT, 2, '0'), hour_val, occupied_count, p_date;
        END IF;
        
        -- Add to result if there's room
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
$function$