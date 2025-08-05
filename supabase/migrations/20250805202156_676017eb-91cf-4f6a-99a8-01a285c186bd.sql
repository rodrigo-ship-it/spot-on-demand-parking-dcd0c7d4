-- Enable real-time updates for critical tables
ALTER TABLE public.parking_spots REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_spots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_parking_spots_owner_active ON public.parking_spots(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_parking_spots_location ON public.parking_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_status ON public.bookings(renter_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_spot_time ON public.bookings(spot_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_reviews_spot ON public.reviews(spot_id);

-- Add database constraints for data integrity
ALTER TABLE public.parking_spots 
ADD CONSTRAINT check_price_positive CHECK (price_per_hour > 0);

ALTER TABLE public.parking_spots 
ADD CONSTRAINT check_spots_positive CHECK (total_spots > 0 AND available_spots >= 0);

ALTER TABLE public.bookings 
ADD CONSTRAINT check_amount_positive CHECK (total_amount > 0);

-- Create function to update spot availability in real-time
CREATE OR REPLACE FUNCTION update_spot_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- When a booking is created, decrease available spots
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE public.parking_spots 
        SET available_spots = available_spots - 1 
        WHERE id = NEW.spot_id AND available_spots > 0;
    END IF;
    
    -- When a booking is completed or cancelled, increase available spots
    IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status IN ('completed', 'cancelled') THEN
        UPDATE public.parking_spots 
        SET available_spots = available_spots + 1 
        WHERE id = NEW.spot_id AND available_spots < total_spots;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic spot availability updates
DROP TRIGGER IF EXISTS trigger_update_spot_availability ON public.bookings;
CREATE TRIGGER trigger_update_spot_availability
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_spot_availability();

-- Create function to clean up expired bookings
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS void AS $$
BEGIN
    -- Mark expired bookings as completed
    UPDATE public.bookings 
    SET status = 'completed'
    WHERE status = 'confirmed' 
    AND end_time < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;