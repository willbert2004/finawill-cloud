-- Auto-seed project ratings whenever a new project is submitted (status pending or pending_review)
CREATE OR REPLACE FUNCTION public.trg_auto_seed_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('pending', 'pending_review') AND NEW.supervisor_id IS NULL THEN
    PERFORM public.seed_project_ratings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_seed_project_ratings ON public.projects;
CREATE TRIGGER auto_seed_project_ratings
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_seed_ratings();

-- Backfill: seed ratings for any existing project that still needs review and has no raters
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.projects p
    WHERE p.status IN ('pending', 'pending_review')
      AND p.supervisor_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.project_ratings pr WHERE pr.project_id = p.id)
  LOOP
    PERFORM public.seed_project_ratings(r.id);
  END LOOP;
END $$;