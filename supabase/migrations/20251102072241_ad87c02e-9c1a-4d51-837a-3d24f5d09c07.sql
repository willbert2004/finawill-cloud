-- Add RLS policy to allow students to create group allocations for their own groups
CREATE POLICY "Students can create group allocations for their groups"
ON public.group_allocations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_groups
    WHERE student_groups.id = group_allocations.group_id
    AND student_groups.created_by = auth.uid()
  )
);