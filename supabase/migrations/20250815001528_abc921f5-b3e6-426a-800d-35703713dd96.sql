-- Add pricing type field to parking_spots table to support both hourly and one-time pricing
ALTER TABLE public.parking_spots 
ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'hourly',
ADD COLUMN one_time_price NUMERIC NULL;

-- Add constraint to ensure valid pricing types
ALTER TABLE public.parking_spots 
ADD CONSTRAINT valid_pricing_type CHECK (pricing_type IN ('hourly', 'one_time'));

-- Add constraint to ensure one_time_price is provided when pricing_type is 'one_time'
ALTER TABLE public.parking_spots 
ADD CONSTRAINT one_time_price_required CHECK (
  (pricing_type = 'hourly') OR 
  (pricing_type = 'one_time' AND one_time_price IS NOT NULL)
);