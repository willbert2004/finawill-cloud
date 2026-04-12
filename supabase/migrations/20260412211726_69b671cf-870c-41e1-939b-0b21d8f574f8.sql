CREATE POLICY "Students can view supervisor profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  (user_type = 'supervisor') AND
  EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.user_id = auth.uid() AND p2.user_type = 'student'
  )
);