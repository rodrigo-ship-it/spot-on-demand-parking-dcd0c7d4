-- Fix the constraint to allow null values for unused pricing fields
ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS price_validation_constraint;

-- Add a more flexible constraint that allows null values for unused pricing fields
ALTER TABLE parking_spots ADD CONSTRAINT price_validation_constraint 
CHECK (
  (pricing_type = 'hourly' AND price_per_hour > 0) OR
  (pricing_type = 'daily' AND daily_price > 0) OR
  (pricing_type = 'one_time' AND one_time_price > 0)
);