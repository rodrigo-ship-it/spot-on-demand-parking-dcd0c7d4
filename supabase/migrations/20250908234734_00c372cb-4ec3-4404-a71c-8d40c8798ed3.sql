-- Add a policy to allow public viewing of reviews for parking spots
-- This allows anyone to see reviews for active parking spots when viewing spot details
CREATE POLICY "Anyone can view reviews for active parking spots" 
ON reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM bookings b
    JOIN parking_spots ps ON b.spot_id = ps.id
    WHERE b.id = reviews.booking_id 
    AND ps.is_active = true
  )
);