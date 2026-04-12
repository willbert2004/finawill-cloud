DROP VIEW IF EXISTS public.supervisor_directory;
CREATE VIEW public.supervisor_directory WITH (security_invoker = true) AS
SELECT p.id, p.user_id, p.full_name, p.user_type, p.department, p.school,
       p.research_areas, p.max_projects, p.current_projects, p.created_at, p.updated_at
FROM public.profiles p WHERE p.user_type = 'supervisor';