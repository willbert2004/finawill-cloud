
-- Update the workload sync function to also handle DELETE
CREATE OR REPLACE FUNCTION public.update_supervisor_project_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles
        SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = OLD.supervisor_id AND status NOT IN ('archived','rejected'))
        WHERE user_id = OLD.supervisor_id;
      UPDATE public.supervisors
        SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = OLD.supervisor_id AND status NOT IN ('archived','rejected'))
        WHERE user_id = OLD.supervisor_id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = NEW.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = NEW.supervisor_id;
      UPDATE public.supervisors SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = NEW.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = NEW.supervisor_id;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.supervisor_id IS DISTINCT FROM NEW.supervisor_id THEN
    IF OLD.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = OLD.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = OLD.supervisor_id;
      UPDATE public.supervisors SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = OLD.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = OLD.supervisor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger to cover INSERT, UPDATE, and DELETE on projects
DROP TRIGGER IF EXISTS projects_supervisor_count_trigger ON public.projects;
DROP TRIGGER IF EXISTS update_supervisor_count_on_projects ON public.projects;
DROP TRIGGER IF EXISTS trg_update_supervisor_project_count ON public.projects;

CREATE TRIGGER trg_update_supervisor_project_count
AFTER INSERT OR UPDATE OR DELETE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_supervisor_project_count();

-- Resync all current counts so existing data is accurate immediately
UPDATE public.supervisors s
SET current_projects = COALESCE((
  SELECT COUNT(*) FROM public.projects p
  WHERE p.supervisor_id = s.user_id AND p.status NOT IN ('archived','rejected')
), 0);

UPDATE public.profiles pr
SET current_projects = COALESCE((
  SELECT COUNT(*) FROM public.projects p
  WHERE p.supervisor_id = pr.user_id AND p.status NOT IN ('archived','rejected')
), 0)
WHERE pr.user_type = 'supervisor';
