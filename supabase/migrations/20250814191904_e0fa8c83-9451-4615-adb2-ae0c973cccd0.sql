-- Fix critical security vulnerabilities in RLS policies

-- 1. Strengthen profiles table RLS policies  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view only their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert only their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update only their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 2. Strengthen payment_methods table RLS policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can create their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;

CREATE POLICY "Users can view only their own payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create only their own payment methods" 
ON public.payment_methods 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update only their own payment methods" 
ON public.payment_methods 
FOR UPDATE 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete only their own payment methods" 
ON public.payment_methods 
FOR DELETE 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 3. Strengthen payout_settings table RLS policies
DROP POLICY IF EXISTS "Users can view their own payout settings" ON public.payout_settings;
DROP POLICY IF EXISTS "Users can create their own payout settings" ON public.payout_settings;
DROP POLICY IF EXISTS "Users can update their own payout settings" ON public.payout_settings;

CREATE POLICY "Users can view only their own payout settings" 
ON public.payout_settings 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create only their own payout settings" 
ON public.payout_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update only their own payout settings" 
ON public.payout_settings 
FOR UPDATE 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 4. Strengthen vehicles table RLS policies
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can create their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;

CREATE POLICY "Users can view only their own vehicles" 
ON public.vehicles 
FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create only their own vehicles" 
ON public.vehicles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update only their own vehicles" 
ON public.vehicles 
FOR UPDATE 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete only their own vehicles" 
ON public.vehicles 
FOR DELETE 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 5. Strengthen bookings table RLS policies to simplify complex joins
DROP POLICY IF EXISTS "Users can view their own bookings as renter" ON public.bookings;
DROP POLICY IF EXISTS "Users can view bookings for their spots" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

-- Create security definer function to check if user owns the spot
CREATE OR REPLACE FUNCTION public.user_owns_spot(spot_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parking_spots 
    WHERE id = spot_id_param AND owner_id = auth.uid()
  );
$$;

CREATE POLICY "Users can view their own bookings as renter" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = renter_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Spot owners can view bookings for their spots" 
ON public.bookings 
FOR SELECT 
USING (public.user_owns_spot(spot_id) AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can create bookings for themselves" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = renter_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Renters can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = renter_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = renter_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Spot owners can update bookings for their spots" 
ON public.bookings 
FOR UPDATE 
USING (public.user_owns_spot(spot_id) AND auth.uid() IS NOT NULL)
WITH CHECK (public.user_owns_spot(spot_id) AND auth.uid() IS NOT NULL);

-- 6. Strengthen messages table RLS policies to simplify complex joins
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages for their bookings" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create security definer function to check if user is involved in booking
CREATE OR REPLACE FUNCTION public.user_involved_in_booking(booking_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN parking_spots ps ON b.spot_id = ps.id
    WHERE b.id = booking_id_param 
    AND (b.renter_id = auth.uid() OR ps.owner_id = auth.uid())
  );
$$;

CREATE POLICY "Users can view messages for their bookings only" 
ON public.messages 
FOR SELECT 
USING (
  (auth.uid() = sender_id OR auth.uid() = recipient_id) 
  AND public.user_involved_in_booking(booking_id) 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can create messages for their bookings only" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND public.user_involved_in_booking(booking_id) 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their received messages only" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = recipient_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = recipient_id AND auth.uid() IS NOT NULL);