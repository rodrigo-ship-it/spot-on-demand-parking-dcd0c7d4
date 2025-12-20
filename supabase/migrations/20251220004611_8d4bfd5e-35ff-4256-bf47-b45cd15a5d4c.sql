-- Fix the most recent booking that was incorrectly marked as completed
UPDATE bookings 
SET status = 'confirmed', 
    updated_at = NOW()
WHERE id = 'c719b97b-7368-4ef3-b79f-1400bbcd6a6a' 
  AND status = 'completed'
  AND end_time_utc > NOW();