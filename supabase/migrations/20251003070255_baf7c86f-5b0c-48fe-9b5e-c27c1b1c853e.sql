-- Allow supervisors to insert their own record
CREATE POLICY "Supervisors can insert their own record"
ON public.supervisors
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());