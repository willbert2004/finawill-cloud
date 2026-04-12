-- Allow students to view members of groups they created
CREATE POLICY "Students can view members of their groups"
ON public.group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.student_groups sg
    WHERE sg.id = group_members.group_id
    AND sg.created_by = auth.uid()
  )
);