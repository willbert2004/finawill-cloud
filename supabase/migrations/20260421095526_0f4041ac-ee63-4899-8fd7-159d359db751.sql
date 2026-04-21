CREATE OR REPLACE FUNCTION public.seed_project_ratings(_project_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proj RECORD;
  inserted_count integer := 0;
  proj_keywords_lower text[];
BEGIN
  SELECT id, title, keywords, department, student_id INTO proj FROM public.projects WHERE id = _project_id;
  IF proj.id IS NULL THEN RETURN 0; END IF;

  -- Lowercase + trim project keywords for case-insensitive matching
  SELECT COALESCE(array_agg(DISTINCT lower(trim(k))) FILTER (WHERE k IS NOT NULL AND trim(k) <> ''), ARRAY[]::text[])
    INTO proj_keywords_lower
  FROM unnest(COALESCE(proj.keywords, ARRAY[]::text[])) AS k;

  -- Insert one pending rating per matching supervisor (case-insensitive research area overlap ONLY)
  INSERT INTO public.project_ratings (project_id, supervisor_id, status)
  SELECT _project_id, s.user_id, 'pending'
  FROM public.supervisors s
  WHERE EXISTS (
    SELECT 1
    FROM unnest(COALESCE(s.research_areas, ARRAY[]::text[])) AS sa
    WHERE lower(trim(sa)) = ANY(proj_keywords_lower)
  )
  ON CONFLICT (project_id, supervisor_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Notify every supervisor who has a pending rating for this project
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT pr.supervisor_id,
         'New project to review',
         'You have been assigned to review "' || proj.title || '". Please rate it.',
         'info',
         '/pending-reviews'
  FROM public.project_ratings pr
  WHERE pr.project_id = _project_id AND pr.status = 'pending';

  RETURN inserted_count;
END;
$function$;