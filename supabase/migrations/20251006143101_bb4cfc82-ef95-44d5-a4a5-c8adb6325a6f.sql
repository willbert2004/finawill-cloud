-- Drop the insecure policy
DROP POLICY IF EXISTS "Supervisors can view other supervisors profiles" ON public.profiles;

-- Create a security definer function to check if a user is a supervisor
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_supervisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND user_type = 'supervisor'
  )
$$;

-- Create a secure policy using the function
CREATE POLICY "Supervisors can view other supervisors profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_supervisor(auth.uid()) AND user_type = 'supervisor'
);