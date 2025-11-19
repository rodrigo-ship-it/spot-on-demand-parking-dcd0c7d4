
-- Update the function to NOT mark bookings as completed_by_system if they ended on time
-- Only update status to completed, leave completed_by_system as false for normal completions
CREATE OR REPLACE FUNCTION update_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update confirmed bookings that have started to 'active'
  UPDATE bookings
  SET status = 'active',
      updated_at = NOW()
  WHERE status = 'confirmed'
    AND start_time <= NOW()
    AND end_time > NOW();
  
  -- Update active bookings that have ended ON TIME to 'completed'
  -- Do NOT set completed_by_system flag - this is for normal completions
  UPDATE bookings
  SET status = 'completed',
      updated_at = NOW()
  WHERE status IN ('confirmed', 'active')
    AND end_time <= NOW()
    AND completed_by_system = false;  -- Only update if not already marked by penalty system
END;
$$;
