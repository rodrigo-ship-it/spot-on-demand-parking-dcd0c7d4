-- Drop the restrictive policy and create a more permissive one
DROP POLICY "Anyone can view reviews for active parking spots" ON reviews;

-- Allow anyone to view all reviews for parking spots (public information)
CREATE POLICY "Anyone can view parking spot reviews" 
ON reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM bookings b
    JOIN parking_spots ps ON b.spot_id = ps.id
    WHERE b.id = reviews.booking_id
  )
);