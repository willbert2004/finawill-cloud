CREATE OR REPLACE FUNCTION public.seed_project_ratings(_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  proj RECORD;
  inserted_count integer := 0;
  proj_keywords_lower text[];
BEGIN
  SELECT id, title, keywords, department, student_id INTO proj FROM public.projects WHERE id = _project_id;
  IF proj.id IS NULL THEN RETURN 0; END IF;

  -- Lowercase + trim project keywords (also split any semicolon-joined entries)
  SELECT COALESCE(array_agg(DISTINCT lower(trim(part))) FILTER (WHERE part IS NOT NULL AND trim(part) <> ''), ARRAY[]::text[])
    INTO proj_keywords_lower
  FROM unnest(COALESCE(proj.keywords, ARRAY[]::text[])) AS k,
       LATERAL regexp_split_to_table(k, '\s*[;,]\s*') AS part;

  -- Insert pending rating per matching supervisor
  -- Split each supervisor research area on ; or , so "IoT; Web Development" matches "Web Development"
  INSERT INTO public.project_ratings (project_id, supervisor_id, status)
  SELECT _project_id, s.user_id, 'pending'
  FROM public.supervisors s
  WHERE EXISTS (
    SELECT 1
    FROM unnest(COALESCE(s.research_areas, ARRAY[]::text[])) AS sa,
         LATERAL regexp_split_to_table(sa, '\s*[;,]\s*') AS sa_part
    WHERE lower(trim(sa_part)) = ANY(proj_keywords_lower)
  )
  ON CONFLICT (project_id, supervisor_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Notify every supervisor with a pending rating for this project
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT pr.supervisor_id,
         'New project to review',
         'You have been assigned to review "' || proj.title || '". Please rate it.',
         'info',
         '/pending-reviews'
  FROM public.project_ratings pr
  WHERE pr.project_id = _project_id AND pr.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = pr.supervisor_id AND n.link = '/pending-reviews'
        AND n.message LIKE '%' || proj.title || '%'
    );

  RETURN inserted_count;
END;
$$;

-- Backfill matching for pending projects without raters
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.id FROM public.projects p
    WHERE p.status IN ('pending','pending_review') AND p.supervisor_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.project_ratings pr WHERE pr.project_id = p.id)
  LOOP
    PERFORM public.seed_project_ratings(r.id);
  END LOOP;
END $$;