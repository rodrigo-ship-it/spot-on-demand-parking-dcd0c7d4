-- Add admin access policy for bookings table
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (current_user_has_role('admin'::app_role));

-- Add admin update access for bookings
CREATE POLICY "Admins can update all bookings"
ON public.bookings
FOR UPDATE
USING (current_user_has_role('admin'::app_role))
WITH CHECK (current_user_has_role('admin'::app_role));