-- Fix comprehensive pricing constraint to include monthly pricing
ALTER TABLE parking_spots DROP CONSTRAINT comprehensive_pricing_constraint;

ALTER TABLE parking_spots ADD CONSTRAINT comprehensive_pricing_constraint CHECK (
  (pricing_type = 'hourly' AND price_per_hour IS NOT NULL AND price_per_hour > 0) OR
  (pricing_type = 'daily' AND daily_price IS NOT NULL AND daily_price > 0) OR
  (pricing_type = 'monthly' AND monthly_price IS NOT NULL AND monthly_price > 0) OR
  (pricing_type = 'one_time' AND one_time_price IS NOT NULL AND one_time_price > 0)
);