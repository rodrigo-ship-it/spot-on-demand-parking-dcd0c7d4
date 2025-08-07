-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Create RLS policies for profile photos
CREATE POLICY "Users can upload their own profile photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own profile photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  license_plate TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vehicles table
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicles
CREATE POLICY "Users can view their own vehicles" 
ON public.vehicles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vehicles" 
ON public.vehicles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles" 
ON public.vehicles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles" 
ON public.vehicles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  last_four TEXT NOT NULL,
  expiry_month INTEGER,
  expiry_year INTEGER,
  cardholder_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_method_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_methods table
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_methods
CREATE POLICY "Users can view their own payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment methods" 
ON public.payment_methods 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" 
ON public.payment_methods 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" 
ON public.payment_methods 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create payout_settings table
CREATE TABLE public.payout_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  bank_name TEXT,
  account_number_last_four TEXT,
  routing_number TEXT,
  account_holder_name TEXT,
  account_type TEXT DEFAULT 'checking',
  stripe_account_id TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payout_settings table
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payout_settings
CREATE POLICY "Users can view their own payout settings" 
ON public.payout_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payout settings" 
ON public.payout_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payout settings" 
ON public.payout_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add avatar_url to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payout_settings_updated_at
  BEFORE UPDATE ON public.payout_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();