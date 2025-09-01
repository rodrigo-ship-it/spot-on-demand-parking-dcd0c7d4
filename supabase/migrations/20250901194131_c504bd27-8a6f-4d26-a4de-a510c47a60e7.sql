-- Drop the existing policy for anonymous users and create a comprehensive one
DROP POLICY IF EXISTS "Public can view parking spots without owner info" ON parking_spots;

-- Create a new policy that allows both anonymous and authenticated users to view all active spots
CREATE POLICY "Everyone can view active parking spots" 
ON parking_spots 
FOR SELECT 
USING (is_active = true);

-- The existing "Owners can view their own spots with full details" policy remains
-- The existing "Users can manage their own spots" policy remains