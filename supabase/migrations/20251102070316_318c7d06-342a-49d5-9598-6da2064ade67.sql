-- Add project_type to student_groups table
ALTER TABLE public.student_groups
ADD COLUMN project_type text;

COMMENT ON COLUMN public.student_groups.project_type IS 'Type of project: Mobile App, Machine Learning, Web App, AI, etc.';