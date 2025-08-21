-- Add column to track completion method
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_by_system BOOLEAN DEFAULT FALSE;

-- Now update this specific booking to trigger the penalty
UPDATE bookings 
SET status = 'completed', 
    completed_by_system = true, 
    updated_at = now() 
WHERE id = '29aaa4cd-2db7-476b-8743-da3dd48e8cf7';