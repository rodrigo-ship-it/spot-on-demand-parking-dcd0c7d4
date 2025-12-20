-- Add verification columns to parking_spots
ALTER TABLE public.parking_spots 
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS verification_documents text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verification_notes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verified_by uuid DEFAULT NULL;

-- Add checkout photo URL to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS checkout_photo_url text DEFAULT NULL;

-- Create verification-documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create parking-images storage bucket (private for checkout photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('parking-images', 'parking-images', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for verification-documents bucket
-- Users can upload their own verification documents
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own verification documents
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND current_user_has_role('admin'::app_role)
);

-- RLS for parking-images bucket (checkout photos)
-- Users can upload checkout photos for their bookings
CREATE POLICY "Users can upload checkout photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'parking-images' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'checkout-photos'
);

-- Admins can view checkout photos
CREATE POLICY "Admins can view checkout photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'parking-images' 
  AND (storage.foldername(name))[1] = 'checkout-photos'
  AND current_user_has_role('admin'::app_role)
);

-- Service role can delete checkout photos (for cleanup function)
CREATE POLICY "Service can delete checkout photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'parking-images' 
  AND (storage.foldername(name))[1] = 'checkout-photos'
);