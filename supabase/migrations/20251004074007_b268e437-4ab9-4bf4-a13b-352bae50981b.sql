-- Allow students to create their own groups
CREATE POLICY "Students can create groups"
ON public.student_groups
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'student'
  )
);

-- Allow students to view groups they created
CREATE POLICY "Students can view groups they created"
ON public.student_groups
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'admin'
  )
);