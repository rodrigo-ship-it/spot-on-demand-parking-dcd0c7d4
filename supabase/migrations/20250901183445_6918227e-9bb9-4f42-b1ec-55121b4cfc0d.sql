-- Fix the incorrectly completed booking
UPDATE bookings 
SET 
  status = 'confirmed',
  completed_by_system = false,
  updated_at = now()
WHERE id = 'eb53e750-141f-4b76-b8c3-51eaf87ac7eb'
  AND status = 'completed'
  AND end_time > now() - interval '3 hours';

-- Add a check constraint to prevent premature completion
-- (This will be a safeguard against the edge function bug)
ALTER TABLE bookings 
ADD CONSTRAINT check_valid_completion 
CHECK (
  status != 'completed' OR 
  completed_by_system = true OR 
  end_time <= now() - interval '10 minutes'
);