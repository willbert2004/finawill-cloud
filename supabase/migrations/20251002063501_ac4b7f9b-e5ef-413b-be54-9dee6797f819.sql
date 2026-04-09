-- Add school field to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school text;

-- Update the handle_profile_user_type function to include school and department
CREATE OR REPLACE FUNCTION public.handle_profile_user_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.students (user_id, department, school)
    VALUES (NEW.user_id, NEW.raw_user_meta_data->>'department', NEW.raw_user_meta_data->>'school')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.user_type = 'supervisor' THEN
    INSERT INTO public.supervisors (user_id, research_areas, department)
    VALUES (NEW.user_id, NEW.research_areas, NULL)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;