-- Update the parking_spots table to support daily pricing properly
-- Add daily_price column for storing daily rates
ALTER TABLE parking_spots ADD COLUMN IF NOT EXISTS daily_price NUMERIC;

-- Update the constraint to handle daily pricing properly  
ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS proper_pricing_constraint;

ALTER TABLE parking_spots ADD CONSTRAINT proper_pricing_constraint 
CHECK (
  (pricing_type = 'one_time' AND one_time_price IS NOT NULL) OR 
  (pricing_type = 'hourly' AND price_per_hour > 0) OR
  (pricing_type = 'daily' AND daily_price IS NOT NULL AND daily_price > 0) OR
  (pricing_type NOT IN ('one_time', 'hourly', 'daily'))
);