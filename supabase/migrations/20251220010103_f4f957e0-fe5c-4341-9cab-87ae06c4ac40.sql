-- Fix the booking that should be active (not completed yet)
-- This booking is for 6:45-7:45 PM today and is currently within the booking window
UPDATE bookings 
SET status = 'confirmed' 
WHERE id = 'c719b97b-7368-4ef3-b79f-1400bbcd6a6a' 
  AND end_time > NOW();