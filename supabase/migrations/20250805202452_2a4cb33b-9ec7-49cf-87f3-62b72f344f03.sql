-- Add missing performance indexes
CREATE INDEX IF NOT EXISTS idx_parking_spots_owner_active ON public.parking_spots(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_parking_spots_location ON public.parking_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_status ON public.bookings(renter_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_spot_time ON public.bookings(spot_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON public.reviews(booking_id);

-- Add data integrity constraints (using DO blocks to handle existing constraints)
DO $$
BEGIN
    -- Add price constraint if it doesn't exist
    BEGIN
        ALTER TABLE public.parking_spots ADD CONSTRAINT check_price_positive CHECK (price_per_hour > 0);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add spots constraint if it doesn't exist
    BEGIN
        ALTER TABLE public.parking_spots ADD CONSTRAINT check_spots_positive CHECK (total_spots > 0 AND available_spots >= 0);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add amount constraint if it doesn't exist
    BEGIN
        ALTER TABLE public.bookings ADD CONSTRAINT check_amount_positive CHECK (total_amount > 0);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END
$$;