-- Remove duplicate reviews, keeping only the most recent one for each booking/reviewer combination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY booking_id, reviewer_id 
      ORDER BY created_at DESC
    ) as rn
  FROM reviews
)
DELETE FROM reviews 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE reviews 
ADD CONSTRAINT reviews_booking_reviewer_unique 
UNIQUE (booking_id, reviewer_id);