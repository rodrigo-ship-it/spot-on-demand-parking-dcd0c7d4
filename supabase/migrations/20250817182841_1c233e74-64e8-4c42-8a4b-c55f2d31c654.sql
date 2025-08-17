-- Drop the problematic check constraint that's preventing daily pricing updates
ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS one_time_price_required;

-- Add a proper check constraint that only requires one_time_price when pricing_type is 'one_time'
ALTER TABLE parking_spots ADD CONSTRAINT proper_pricing_constraint 
CHECK (
  (pricing_type = 'one_time' AND one_time_price IS NOT NULL) OR 
  (pricing_type != 'one_time')
);