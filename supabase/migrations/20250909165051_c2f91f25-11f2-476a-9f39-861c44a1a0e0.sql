-- Add auto_extend_enabled column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN auto_extend_enabled boolean DEFAULT false;

-- Add index for efficient queries on auto-extension enabled bookings
CREATE INDEX idx_bookings_auto_extend ON public.bookings(auto_extend_enabled) WHERE auto_extend_enabled = true;