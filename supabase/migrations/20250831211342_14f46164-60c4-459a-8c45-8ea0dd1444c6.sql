-- Fix the existing monthly booking that has incorrect end date
UPDATE bookings 
SET 
  end_time = '2025-10-01 23:59:00',
  display_duration_text = '1 month',
  display_end_time = NULL
WHERE id = '7bba6ad3-e760-468e-82af-8b8662bc00a8';

-- Fix any other monthly bookings that might have the same issue
-- (where end_time is same day as start_time for monthly pricing spots)
UPDATE bookings 
SET 
  end_time = CASE 
    WHEN ps.pricing_type = 'monthly' THEN 
      (DATE(bookings.start_time) + INTERVAL '1 month' - INTERVAL '1 day')::timestamp + TIME '23:59:00'
    ELSE bookings.end_time
  END,
  display_duration_text = CASE 
    WHEN ps.pricing_type = 'monthly' THEN '1 month'
    ELSE bookings.display_duration_text
  END,
  display_end_time = CASE 
    WHEN ps.pricing_type = 'monthly' THEN NULL
    ELSE bookings.display_end_time
  END
FROM parking_spots ps
WHERE bookings.spot_id = ps.id 
  AND ps.pricing_type = 'monthly'
  AND DATE(bookings.start_time) = DATE(bookings.end_time);