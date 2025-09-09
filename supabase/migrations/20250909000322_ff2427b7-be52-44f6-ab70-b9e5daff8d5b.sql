-- Add unique constraint to prevent multiple reviews per booking per user
-- This ensures each reviewer can only leave one review per booking
ALTER TABLE reviews 
ADD CONSTRAINT reviews_booking_reviewer_unique 
UNIQUE (booking_id, reviewer_id);