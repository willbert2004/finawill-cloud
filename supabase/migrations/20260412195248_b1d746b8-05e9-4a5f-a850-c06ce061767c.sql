
-- Add super_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Insert the school
INSERT INTO public.schools (id, name, is_active)
VALUES (gen_random_uuid(), 'School of Information Sciences and Technology', true)
ON CONFLICT DO NOTHING;

-- Insert departments linked to the school
INSERT INTO public.departments (id, name, school_id, is_active)
SELECT gen_random_uuid(), dept_name, s.id, true
FROM public.schools s,
     unnest(ARRAY['ISA', 'IT', 'Software Engineering', 'Computer Science']) AS dept_name
WHERE s.name = 'School of Information Sciences and Technology'
ON CONFLICT DO NOTHING;
