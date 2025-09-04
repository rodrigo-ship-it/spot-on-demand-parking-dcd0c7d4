-- Enable realtime for reviews table
ALTER TABLE public.reviews REPLICA IDENTITY FULL;

-- Add the reviews table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;