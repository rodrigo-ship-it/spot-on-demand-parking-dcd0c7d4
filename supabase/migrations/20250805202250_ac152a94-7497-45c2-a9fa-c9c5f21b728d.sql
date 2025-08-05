-- Add missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_parking_spots_owner_active ON public.parking_spots(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_parking_spots_location ON public.parking_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_status ON public.bookings(renter_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_spot_time ON public.bookings(spot_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_reviews_spot ON public.reviews(booking_id);

-- Add database constraints for data integrity
ALTER TABLE public.parking_spots 
ADD CONSTRAINT IF NOT EXISTS check_price_positive CHECK (price_per_hour > 0);

ALTER TABLE public.parking_spots 
ADD CONSTRAINT IF NOT EXISTS check_spots_positive CHECK (total_spots > 0 AND available_spots >= 0);

ALTER TABLE public.bookings 
ADD CONSTRAINT IF NOT EXISTS check_amount_positive CHECK (total_amount > 0);

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create missing triggers for automatic timestamps
DROP TRIGGER IF EXISTS trigger_update_bookings_updated_at ON public.bookings;
CREATE TRIGGER trigger_update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_spots_updated_at ON public.parking_spots;
CREATE TRIGGER trigger_update_spots_updated_at
    BEFORE UPDATE ON public.parking_spots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create missing trigger for spot availability updates
DROP TRIGGER IF EXISTS trigger_update_spot_availability ON public.bookings;
CREATE TRIGGER trigger_update_spot_availability
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_spot_availability();