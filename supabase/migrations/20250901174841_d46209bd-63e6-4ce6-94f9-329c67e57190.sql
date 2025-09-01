-- Fix security vulnerability: Strengthen profiles table RLS policies and secure functions
-- Use DROP IF EXISTS and unique policy names to avoid conflicts

-- Remove all existing policies on profiles table
DROP POLICY IF EXISTS "Block all anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can access all profiles for support" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles for any user" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create secure RLS policies with unique names
CREATE POLICY "secure_block_anonymous_profile_access" ON public.profiles
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "secure_users_view_own_profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "secure_users_update_own_profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "secure_users_insert_own_profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "secure_admin_full_profile_access" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.current_user_has_role('admin'::app_role))
  WITH CHECK (public.current_user_has_role('admin'::app_role));

-- Update profile access functions to require authentication
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
  WHERE user_id = user_id_param AND auth.uid() IS NOT NULL;
$$;

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
  WHERE p.user_id = profile_user_id AND auth.uid() IS NOT NULL;
$$;