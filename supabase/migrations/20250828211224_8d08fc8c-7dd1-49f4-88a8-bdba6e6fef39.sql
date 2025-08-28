-- Fix the test function to include search_path
CREATE OR REPLACE FUNCTION public.test_slot_availability(p_spot_id uuid, p_slot_time text, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  slot_start_timestamp TIMESTAMP WITH TIME ZONE;
  slot_end_timestamp TIMESTAMP WITH TIME ZONE;
  occupied_count INTEGER;
BEGIN
  -- Create timestamps for the specific slot
  slot_start_timestamp := (p_date || ' ' || p_slot_time || ':00')::timestamp AT TIME ZONE 'America/New_York';
  slot_end_timestamp := slot_start_timestamp + '1 hour'::interval + '30 minutes'::interval;
  
  -- Count occupied spots
  SELECT COUNT(*) INTO occupied_count
  FROM bookings
  WHERE spot_id = p_spot_id
    AND status IN ('confirmed', 'active')
    AND start_time_utc IS NOT NULL 
    AND end_time_utc IS NOT NULL
    AND slot_start_timestamp < end_time_utc 
    AND start_time_utc < slot_end_timestamp;
  
  RETURN jsonb_build_object(
    'slot_time', p_slot_time,
    'slot_start_utc', slot_start_timestamp,
    'slot_end_utc', slot_end_timestamp,
    'occupied_count', occupied_count,
    'is_available', occupied_count = 0
  );
END;
$function$