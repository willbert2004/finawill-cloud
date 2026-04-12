
CREATE OR REPLACE FUNCTION public.sync_supervisor_research_areas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_type = 'supervisor' AND NEW.research_areas IS DISTINCT FROM OLD.research_areas THEN
    UPDATE public.supervisors
    SET research_areas = NEW.research_areas
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_research_areas_to_supervisors
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_supervisor_research_areas();

-- Also sync existing profile research_areas to supervisors table now
UPDATE public.supervisors s
SET research_areas = p.research_areas
FROM public.profiles p
WHERE p.user_id = s.user_id
  AND p.user_type = 'supervisor'
  AND p.research_areas IS NOT NULL;
