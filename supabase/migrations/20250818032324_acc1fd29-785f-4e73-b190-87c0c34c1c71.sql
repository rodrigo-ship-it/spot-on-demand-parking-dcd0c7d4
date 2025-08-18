-- Update the admin function to properly identify the current admin user
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Check if the current user is a known admin
  SELECT auth.uid()::text IN (
    '6873bf76-bda8-4035-991c-db90d509ffd6',  -- rodrigo@arrivparking.com
    '00000000-0000-0000-0000-000000000000'   -- system operations
  ) OR EXISTS (
    -- Or if they have created parking spots (spot owners can be admins)
    SELECT 1 FROM parking_spots 
    WHERE owner_id = auth.uid()
  );
$$;