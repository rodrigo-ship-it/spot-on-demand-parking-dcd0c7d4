-- Fix the incorrectly extended booking to show proper 4:30 PM end time
UPDATE bookings 
SET 
  end_time = '2025-08-31 16:30:00',
  end_time_utc = '2025-08-31 20:30:00+00',
  display_end_time = '4:30 PM'
WHERE id = '7143de16-3885-40a9-a4fc-e5bd77326183';