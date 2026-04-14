CREATE POLICY "Students can view duplicate projects"
ON public.projects
FOR SELECT
TO authenticated
USING (is_duplicate = true AND has_role(auth.uid(), 'student'::app_role));