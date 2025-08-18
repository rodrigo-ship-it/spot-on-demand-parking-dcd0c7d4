-- Create a function to check if the current user is an admin
-- For now, we'll identify admins by checking if they can access admin functionality
-- This can be enhanced later with a proper admin role system
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- For now, we'll use a simple check - admins are users who have created parking spots
  -- This can be enhanced with a proper role-based system later
  SELECT EXISTS (
    SELECT 1 FROM parking_spots 
    WHERE owner_id = auth.uid()
  ) OR auth.uid()::text = '00000000-0000-0000-0000-000000000000'::text; -- Allow system operations
$$;

-- Create an admin-specific RLS policy for inserting profiles
CREATE POLICY "Admins can create profiles for any user" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.is_admin());

-- Also allow admins to view all profiles for admin dashboard functionality
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());