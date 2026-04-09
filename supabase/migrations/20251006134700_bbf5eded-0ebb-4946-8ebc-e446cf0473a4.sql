-- Allow supervisors to view all supervisors for allocation purposes
CREATE POLICY "Supervisors can view all supervisors"
ON public.supervisors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_type = 'supervisor'
  )
);