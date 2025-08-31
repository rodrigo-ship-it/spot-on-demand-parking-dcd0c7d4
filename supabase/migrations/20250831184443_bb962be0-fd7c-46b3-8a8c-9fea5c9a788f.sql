-- Fix the wrongly completed booking due to timezone bug
UPDATE bookings 
SET status = 'active', 
    completed_by_system = FALSE,
    updated_at = now()
WHERE id = '7143de16-3885-40a9-a4fc-e5bd77326183'
  AND status = 'completed';