-- Reset only the specific incorrectly completed booking
UPDATE bookings 
SET status = 'active', updated_at = now()
WHERE id = 'c719b97b-7368-4ef3-b79f-1400bbcd6a6a';