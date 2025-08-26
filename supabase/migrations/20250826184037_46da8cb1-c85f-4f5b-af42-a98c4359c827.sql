-- Fix overlap calculation logic in get_available_time_slots function
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
  slot_start_minutes INTEGER;
  slot_end_minutes INTEGER;
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
        -- Calculate slot time range in minutes for clearer logic
        slot_start_minutes := hour_val * 60 + (minute_val * 30);
        slot_end_minutes := slot_start_minutes + (p_duration_hours * 60);
        
        -- Count occupied spots during this time slot (only confirmed/active bookings)
        -- Two time ranges overlap if: start1 < end2 AND start2 < end1
        SELECT COUNT(*) INTO occupied_count
        FROM bookings
        WHERE spot_id = p_spot_id
          AND status IN ('confirmed', 'active')
          AND DATE(start_time) = p_date
          AND (
            -- Booking overlaps with slot if:
            -- slot_start < booking_end AND booking_start < slot_end
            slot_start_minutes < (EXTRACT(HOUR FROM end_time) * 60 + EXTRACT(MINUTE FROM end_time))
            AND
            (EXTRACT(HOUR FROM start_time) * 60 + EXTRACT(MINUTE FROM start_time)) < slot_end_minutes
          );
        
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