-- Drop the recursive policy
DROP POLICY IF EXISTS "Students can view members of their groups" ON public.group_members;

-- Create a security definer function to check group ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.user_created_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_groups
    WHERE id = _group_id AND created_by = _user_id
  )
$$;

-- Re-create the policy using the function
CREATE POLICY "Students can view members of their groups"
ON public.group_members
FOR SELECT
USING (public.user_created_group(auth.uid(), group_id));