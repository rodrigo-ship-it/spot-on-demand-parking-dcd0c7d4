-- Fix all the constraint issues for daily pricing

-- 1. Drop the old price_per_hour constraint that's causing issues
ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS check_price_positive;

-- 2. Update the valid pricing type constraint to include 'daily'
ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS valid_pricing_type;
ALTER TABLE parking_spots ADD CONSTRAINT valid_pricing_type 
CHECK (pricing_type = ANY (ARRAY['hourly'::text, 'one_time'::text, 'daily'::text]));

-- 3. Add a new constraint that properly validates prices based on pricing type
ALTER TABLE parking_spots ADD CONSTRAINT price_validation_constraint 
CHECK (
  (pricing_type = 'hourly' AND price_per_hour > 0) OR
  (pricing_type = 'daily' AND daily_price > 0) OR
  (pricing_type = 'one_time' AND one_time_price > 0)
);