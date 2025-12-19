-- End all currently active bookings
UPDATE bookings 
SET status = 'completed', 
    updated_at = now() 
WHERE status = 'active';