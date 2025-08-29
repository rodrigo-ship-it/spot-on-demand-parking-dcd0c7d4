-- Revert the incorrectly completed booking back to active status
UPDATE bookings 
SET status = 'active', 
    completed_by_system = false,
    updated_at = now() 
WHERE id = 'c62661d4-0031-4876-818a-2f1b36c3ec84';