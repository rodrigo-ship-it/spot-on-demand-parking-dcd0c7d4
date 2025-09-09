-- Function to update parking spot rating and review count
CREATE OR REPLACE FUNCTION update_parking_spot_rating()
RETURNS TRIGGER AS $$
DECLARE
  spot_id_to_update UUID;
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Get the spot_id from the booking associated with this review
  SELECT ps.id INTO spot_id_to_update
  FROM parking_spots ps
  JOIN bookings b ON b.spot_id = ps.id
  WHERE b.id = COALESCE(NEW.booking_id, OLD.booking_id);
  
  -- Calculate average rating and total count for this spot
  SELECT 
    ROUND(AVG(r.rating), 1),
    COUNT(r.id)
  INTO avg_rating, review_count
  FROM reviews r
  JOIN bookings b ON b.id = r.booking_id
  WHERE b.spot_id = spot_id_to_update;
  
  -- Update the parking spot with the new rating and review count
  UPDATE parking_spots
  SET 
    rating = COALESCE(avg_rating, 0),
    total_reviews = COALESCE(review_count, 0),
    updated_at = now()
  WHERE id = spot_id_to_update;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update parking spot rating when reviews are added/updated/deleted
DROP TRIGGER IF EXISTS update_spot_rating_on_review_change ON reviews;
CREATE TRIGGER update_spot_rating_on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_parking_spot_rating();