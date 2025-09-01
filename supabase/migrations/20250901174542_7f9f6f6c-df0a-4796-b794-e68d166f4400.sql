-- Fix security vulnerability: Strengthen profiles table RLS policies and secure functions

-- First, drop the existing potentially problematic RLS policies and recreate them more securely
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can access all profiles for support" ON public.profiles;

-- Create a comprehensive RLS policy that denies ALL access to anonymous users
CREATE POLICY "Block all anonymous access to profiles" ON public.profiles
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Allow authenticated users to view only their own profile
CREATE POLICY "Users can view their own profile only" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to update only their own profile
CREATE POLICY "Users can update their own profile only" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile only" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Secure admin access with proper role checking
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.current_user_has_role('admin'::app_role))
  WITH CHECK (public.current_user_has_role('admin'::app_role));

-- Update the get_public_profile_data function to require authentication
CREATE OR REPLACE FUNCTION public.get_public_profile_data(user_id_param uuid)
RETURNS TABLE(full_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return data if the requester is authenticated
  SELECT 
    CASE WHEN auth.uid() IS NOT NULL THEN COALESCE(full_name, 'Anonymous User') ELSE 'Anonymous User' END as full_name,
    CASE WHEN auth.uid() IS NOT NULL THEN avatar_url ELSE NULL END as avatar_url
  FROM profiles 
  WHERE user_id = user_id_param;
$$;

-- Update get_safe_profile_info function to require authentication
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(profile_user_id uuid)
RETURNS TABLE(full_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return data if the requester is authenticated
  SELECT 
    CASE WHEN auth.uid() IS NOT NULL THEN COALESCE(p.full_name, 'Anonymous User') ELSE 'Anonymous User' END as full_name,
    CASE WHEN auth.uid() IS NOT NULL THEN p.avatar_url ELSE NULL END as avatar_url
  FROM profiles p
  WHERE p.user_id = profile_user_id;
$$;

-- Add a function to safely get minimal profile data for public use (only when needed for app functionality)
CREATE OR REPLACE FUNCTION public.get_minimal_public_profile(user_id_param uuid)
RETURNS TABLE(display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return a safe display name, no sensitive information
  SELECT 
    CASE 
      WHEN full_name IS NOT NULL AND full_name != '' THEN 
        split_part(full_name, ' ', 1) || ' ' || left(split_part(full_name, ' ', 2), 1) || '.'
      ELSE 'User'
    END as display_name
  FROM profiles 
  WHERE user_id = user_id_param;
$$;

-- Log this security fix
SELECT public.log_security_event_enhanced(
  'profiles_security_hardening',
  jsonb_build_object(
    'action', 'strengthened_rls_policies',
    'tables_affected', 'profiles',
    'functions_updated', ARRAY['get_public_profile_data', 'get_safe_profile_info'],
    'timestamp', extract(epoch from now())
  ),
  auth.uid(),
  'critical'
);