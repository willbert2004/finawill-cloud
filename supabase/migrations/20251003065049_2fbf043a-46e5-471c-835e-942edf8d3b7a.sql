-- Add school and department columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school text,
ADD COLUMN IF NOT EXISTS department text;

-- Update handle_new_user to store school and department in profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, user_type, full_name, school, department)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'department'
  );
  RETURN NEW;
END;
$$;

-- Fix handle_profile_user_type to use profile columns instead of raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_profile_user_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.students (user_id, department, school)
    VALUES (NEW.user_id, NEW.department, NEW.school)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.user_type = 'supervisor' THEN
    INSERT INTO public.supervisors (user_id, research_areas, department)
    VALUES (NEW.user_id, NEW.research_areas, NEW.department)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;