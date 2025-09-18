-- Remove the problematic RLS policy that calls log_api_access function
DROP POLICY IF EXISTS "Authenticated users can view active spots with monitoring" ON parking_spots;

-- Create a simple RLS policy without logging that causes INSERT operations
CREATE POLICY "Authenticated users can view active spots" 
ON parking_spots 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Also ensure anonymous users can still browse
-- The anonymous policy should already exist but let's recreate it to be sure
DROP POLICY IF EXISTS "Anonymous users can browse active spots (no owner data)" ON parking_spots;
CREATE POLICY "Anonymous users can browse active spots" 
ON parking_spots 
FOR SELECT 
USING (is_active = true);