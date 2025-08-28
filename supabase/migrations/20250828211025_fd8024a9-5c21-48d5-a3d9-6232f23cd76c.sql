-- Fix existing booking's UTC times (convert from EDT to UTC properly)
-- 6:30 PM EDT = 22:30 UTC, 7:30 PM EDT = 23:30 UTC
UPDATE bookings 
SET 
  start_time_utc = '2025-08-28 22:30:00+00',
  end_time_utc = '2025-08-28 23:30:00+00'
WHERE spot_id = '79d1a816-5a2c-4cc7-8629-045b89b93faa' 
  AND display_start_time = '6:30 PM' 
  AND display_end_time = '7:30 PM'
  AND status IN ('confirmed', 'active');