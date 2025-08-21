-- First ensure the column exists and update this specific booking
UPDATE bookings 
SET status = 'completed', 
    completed_by_system = true, 
    updated_at = now() 
WHERE id = '29aaa4cd-2db7-476b-8743-da3dd48e8cf7';