-- Update all parking spot ratings based on existing reviews
DO $$
DECLARE
  spot_record RECORD;
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Loop through all parking spots that have reviews
  FOR spot_record IN 
    SELECT DISTINCT ps.id
    FROM parking_spots ps
    JOIN bookings b ON b.spot_id = ps.id
    JOIN reviews r ON r.booking_id = b.id
  LOOP
    -- Calculate average rating and total count for this spot
    SELECT 
      ROUND(AVG(r.rating), 1),
      COUNT(r.id)
    INTO avg_rating, review_count
    FROM reviews r
    JOIN bookings b ON b.id = r.booking_id
    WHERE b.spot_id = spot_record.id;
    
    -- Update the parking spot with the new rating and review count
    UPDATE parking_spots
    SET 
      rating = COALESCE(avg_rating, 0),
      total_reviews = COALESCE(review_count, 0),
      updated_at = now()
    WHERE id = spot_record.id;
    
    RAISE NOTICE 'Updated spot % with rating % and % reviews', spot_record.id, avg_rating, review_count;
  END LOOP;
END $$;