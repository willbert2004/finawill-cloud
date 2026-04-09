-- Drop the duplicate policy if it exists and recreate with correct permissions
DROP POLICY IF EXISTS "Students can create group allocations for their groups" ON public.group_allocations;
DROP POLICY IF EXISTS "Students can create allocations for their groups" ON public.group_allocations;

-- Create a clear policy for students to create group allocations
CREATE POLICY "Students can insert group allocations"
ON public.group_allocations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if the user is a student and created the group
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.user_type = 'student'
  )
  AND
  EXISTS (
    SELECT 1 FROM public.student_groups sg
    WHERE sg.id = group_allocations.group_id
    AND sg.created_by = auth.uid()
  )
);

-- Also allow students to view their group allocations
CREATE POLICY "Students can view their group allocations"
ON public.group_allocations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_groups sg
    WHERE sg.id = group_allocations.group_id
    AND sg.created_by = auth.uid()
  )
);