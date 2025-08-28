-- Debug version to see what's happening with timezone conversions
CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_spot_id uuid, p_date date, p_duration_hours integer DEFAULT 1, p_timezone text DEFAULT 'America/New_York')
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result TEXT := '';
  total_spots INTEGER := 1;
  occupied_count INTEGER;
  slot_time TEXT;
  hour_val INTEGER;
  minute_val INTEGER;
  slot_start_timestamp TIMESTAMP WITH TIME ZONE;
  slot_end_timestamp TIMESTAMP WITH TIME ZONE;
  debug_info TEXT := '';
BEGIN
  -- Generate JSON array of available time slots  
  result := '[';
  
  -- Test specific time slots around 6:30 PM to debug
  FOR hour_val IN 18..19 LOOP
    FOR minute_val IN 0..1 LOOP
      slot_time := hour_val || ':' || LPAD((minute_val * 30)::TEXT, 2, '0');
      
      -- Create timestamps in the user's timezone for this slot
      slot_start_timestamp := (p_date || ' ' || slot_time || ':00')::timestamp AT TIME ZONE p_timezone;
      slot_end_timestamp := slot_start_timestamp + (p_duration_hours || ' hours')::interval + '30 minutes'::interval;
      
      -- Count occupied spots during this time slot
      SELECT COUNT(*) INTO occupied_count
      FROM bookings
      WHERE spot_id = p_spot_id
        AND status IN ('confirmed', 'active')
        AND start_time_utc IS NOT NULL 
        AND end_time_utc IS NOT NULL
        AND slot_start_timestamp < end_time_utc 
        AND start_time_utc < slot_end_timestamp;
      
      -- Add debug info
      debug_info := format('Slot %s: start=%s, end=%s, occupied=%s', 
        slot_time, slot_start_timestamp, slot_end_timestamp, occupied_count);
      
      RAISE NOTICE '%', debug_info;
      
      -- Add to result
      IF result != '[' THEN
        result := result || ',';
      END IF;
      
      result := result || '{"time":"' || slot_time || '","available":' || 
                (total_spots - occupied_count) || ',"isAvailable":' || 
                CASE WHEN occupied_count < total_spots THEN 'true' ELSE 'false' END || 
                ',"debug":"' || debug_info || '"}';
    END LOOP;
  END LOOP;
  
  result := result || ']';
  RETURN result;
END;
$function$