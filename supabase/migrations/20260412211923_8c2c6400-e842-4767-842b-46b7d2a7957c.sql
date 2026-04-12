DROP POLICY IF EXISTS "Students can view supervisor profiles" ON public.profiles;

CREATE POLICY "Students can view supervisor profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  (user_type = 'supervisor') AND
  public.has_role(auth.uid(), 'student'::app_role)
);