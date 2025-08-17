-- Make price_per_hour nullable and update the constraint
ALTER TABLE parking_spots ALTER COLUMN price_per_hour DROP NOT NULL;
ALTER TABLE parking_spots ALTER COLUMN price_per_hour DROP DEFAULT;

-- Update the constraint to handle nullable price fields properly  
ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS price_validation_constraint;
ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS proper_pricing_constraint;

-- Add a comprehensive constraint that handles all pricing types correctly
ALTER TABLE parking_spots ADD CONSTRAINT comprehensive_pricing_constraint 
CHECK (
  (pricing_type = 'hourly' AND price_per_hour IS NOT NULL AND price_per_hour > 0) OR
  (pricing_type = 'daily' AND daily_price IS NOT NULL AND daily_price > 0) OR
  (pricing_type = 'one_time' AND one_time_price IS NOT NULL AND one_time_price > 0)
);