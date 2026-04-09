-- Allow students to insert members into groups they created
CREATE POLICY "Students can insert members into their groups"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.student_groups
    WHERE student_groups.id = group_members.group_id
    AND student_groups.created_by = auth.uid()
  )
);