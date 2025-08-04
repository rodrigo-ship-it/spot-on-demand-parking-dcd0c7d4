-- Set up storage policies for parking spot images
CREATE POLICY "Anyone can view parking spot images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'parking-images');

CREATE POLICY "Authenticated users can upload parking spot images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'parking-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own parking spot images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'parking-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own parking spot images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'parking-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for parking_spots table
ALTER TABLE public.parking_spots REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_spots;

-- Enable realtime for bookings table
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Create function to automatically update spot availability when bookings change
CREATE OR REPLACE FUNCTION public.update_spot_availability()
RETURNS TRIGGER AS $$
DECLARE
  spot_id_to_update UUID;
  occupied_spots INTEGER;
BEGIN
  -- Get the spot_id from the booking
  IF TG_OP = 'DELETE' THEN
    spot_id_to_update := OLD.spot_id;
  ELSE
    spot_id_to_update := NEW.spot_id;
  END IF;

  -- Count currently active bookings for this spot
  SELECT COUNT(*) INTO occupied_spots
  FROM bookings
  WHERE spot_id = spot_id_to_update
    AND status IN ('confirmed', 'active')
    AND start_time <= NOW()
    AND end_time > NOW();

  -- Update available spots based on total spots minus occupied spots
  UPDATE parking_spots
  SET available_spots = GREATEST(0, total_spots - occupied_spots),
      updated_at = NOW()
  WHERE id = spot_id_to_update;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update availability
CREATE TRIGGER trigger_update_spot_availability_on_insert
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spot_availability();

CREATE TRIGGER trigger_update_spot_availability_on_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spot_availability();

CREATE TRIGGER trigger_update_spot_availability_on_delete
  AFTER DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spot_availability();