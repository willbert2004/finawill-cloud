-- Fix 1: Restrict notifications INSERT - drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can receive notifications" ON public.notifications;

-- Only allow self-insert or admin insert
CREATE POLICY "Users or admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Fix 2: Create a secure view for supervisor directory (excludes email)
CREATE OR REPLACE VIEW public.supervisor_directory AS
SELECT
  id,
  user_id,
  full_name,
  user_type,
  research_areas,
  school,
  department,
  max_projects,
  current_projects,
  created_at,
  updated_at
FROM public.profiles
WHERE user_type = 'supervisor';
