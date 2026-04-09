-- Fix Student Groups visibility for students
DROP POLICY IF EXISTS "Students can view their groups" ON public.student_groups;

CREATE POLICY "Students can view their groups"
ON public.student_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = student_groups.id
      AND gm.student_id = auth.uid()
  )
);