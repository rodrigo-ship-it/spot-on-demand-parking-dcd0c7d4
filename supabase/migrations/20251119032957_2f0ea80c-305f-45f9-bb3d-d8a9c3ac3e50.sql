
-- Create a function to automatically update booking statuses
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
  
  -- Update active bookings that have ended to 'completed'
  UPDATE bookings
  SET status = 'completed',
      completed_by_system = true,
      updated_at = NOW()
  WHERE status IN ('confirmed', 'active')
    AND end_time <= NOW();
END;
$$;

-- Create a cron job to run this every 5 minutes
SELECT cron.schedule(
  'update-booking-statuses',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT update_expired_bookings();'
);
