-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create parking_spots table
CREATE TABLE public.parking_spots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  address text NOT NULL,
  latitude decimal,
  longitude decimal,
  price_per_hour decimal NOT NULL DEFAULT 0,
  spot_type text NOT NULL CHECK (spot_type IN ('single-spot', 'entire-garage', 'entire-outdoor-lot')),
  total_spots integer DEFAULT 1,
  available_spots integer DEFAULT 1,
  availability_schedule jsonb,
  amenities text[],
  images text[],
  is_active boolean NOT NULL DEFAULT true,
  rating decimal DEFAULT 0,
  total_reviews integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for parking spots
ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;

-- Create policies for parking spots
CREATE POLICY "Anyone can view active parking spots" 
ON public.parking_spots 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can manage their own spots" 
ON public.parking_spots 
FOR ALL 
USING (auth.uid() = owner_id);

-- Create bookings table
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id uuid NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  total_amount decimal NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  payment_intent_id text,
  qr_code_used boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings
CREATE POLICY "Users can view their own bookings as renter" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = renter_id);

CREATE POLICY "Users can view bookings for their spots" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() IN (SELECT owner_id FROM public.parking_spots WHERE id = spot_id));

CREATE POLICY "Users can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = renter_id OR auth.uid() IN (SELECT owner_id FROM public.parking_spots WHERE id = spot_id));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parking_spots_updated_at
  BEFORE UPDATE ON public.parking_spots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();