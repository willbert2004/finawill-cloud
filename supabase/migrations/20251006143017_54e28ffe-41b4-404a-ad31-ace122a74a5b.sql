-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Supervisors can view other supervisors profiles" ON public.profiles;

-- Create a new policy that doesn't cause recursion by using auth.jwt() instead
-- This checks the user_type from the JWT token metadata instead of querying the profiles table
CREATE POLICY "Supervisors can view other supervisors profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'user_type' = 'supervisor' AND user_type = 'supervisor')
);