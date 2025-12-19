-- Add minimum_booking_hours column to parking_spots
ALTER TABLE public.parking_spots 
ADD COLUMN IF NOT EXISTS minimum_booking_hours numeric DEFAULT 1;

-- Update existing spots to have a minimum of 1 hour
UPDATE public.parking_spots 
SET minimum_booking_hours = 1 
WHERE minimum_booking_hours IS NULL;