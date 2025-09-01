-- Fix the booking status back to confirmed
UPDATE bookings 
SET 
  status = 'confirmed',
  completed_by_system = false,
  updated_at = now()
WHERE id = 'eb53e750-141f-4b76-b8c3-51eaf87ac7eb';