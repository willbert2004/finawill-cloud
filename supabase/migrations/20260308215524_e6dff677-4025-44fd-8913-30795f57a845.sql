
-- Sync profile name changes to group_members
CREATE OR REPLACE FUNCTION public.sync_profile_to_group_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    UPDATE public.group_members
    SET full_name = NEW.full_name
    WHERE student_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_name_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_group_members();

-- Sync profile department changes to supervisors table
CREATE OR REPLACE FUNCTION public.sync_profile_to_supervisors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_type = 'supervisor' AND (OLD.department IS DISTINCT FROM NEW.department OR OLD.research_areas IS DISTINCT FROM NEW.research_areas) THEN
    UPDATE public.supervisors
    SET 
      department = NEW.department,
      research_areas = NEW.research_areas
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_supervisor_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_supervisors();

-- Sync profile department changes to students table
CREATE OR REPLACE FUNCTION public.sync_profile_to_students()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_type = 'student' AND (OLD.department IS DISTINCT FROM NEW.department OR OLD.school IS DISTINCT FROM NEW.school) THEN
    UPDATE public.students
    SET 
      department = NEW.department,
      school = NEW.school
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_student_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_students();
