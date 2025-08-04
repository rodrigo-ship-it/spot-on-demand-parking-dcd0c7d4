-- Create storage bucket for parking spot images
INSERT INTO storage.buckets (id, name, public) VALUES ('parking-images', 'parking-images', true);

-- Create policy for public access to parking images
CREATE POLICY "Parking images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'parking-images');

-- Create policy for authenticated users to upload images
CREATE POLICY "Authenticated users can upload parking images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'parking-images' AND auth.role() = 'authenticated');

-- Create policy for users to update their own images
CREATE POLICY "Users can update their own parking images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'parking-images' AND auth.role() = 'authenticated');

-- Create policy for users to delete their own images
CREATE POLICY "Users can delete their own parking images"
ON storage.objects FOR DELETE
USING (bucket_id = 'parking-images' AND auth.role() = 'authenticated');