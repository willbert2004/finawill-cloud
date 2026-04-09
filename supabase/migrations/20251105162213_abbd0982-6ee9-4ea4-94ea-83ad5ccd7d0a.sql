-- Allow supervisors to delete student groups
CREATE POLICY "Supervisors can delete groups"
ON public.student_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid()
      AND user_type = 'supervisor'
  )
);