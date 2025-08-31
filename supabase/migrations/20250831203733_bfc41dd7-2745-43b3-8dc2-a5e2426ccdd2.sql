-- Remove the conflicting valid_pricing_type constraint that doesn't include monthly
ALTER TABLE parking_spots DROP CONSTRAINT valid_pricing_type;