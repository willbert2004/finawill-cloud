-- Add dedicated duplicate_score column so rating averages don't overwrite similarity results
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS duplicate_score numeric DEFAULT 0;

-- Backfill: for projects currently flagged as duplicates, copy similarity_score into duplicate_score
UPDATE public.projects
SET duplicate_score = COALESCE(similarity_score, 0)
WHERE is_duplicate = true AND (duplicate_score IS NULL OR duplicate_score = 0);

-- Update finalize_project_allocation to no longer overwrite similarity_score with rating average
CREATE OR REPLACE FUNCTION public.finalize_project_allocation(_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_count integer;
  rated_count integer;
  avg_score numeric;
  chosen_supervisor uuid;
  agg_comments text;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'rated')
  INTO total_count, rated_count
  FROM public.project_ratings WHERE project_id = _project_id;

  IF total_count = 0 OR rated_count < total_count THEN
    RETURN;
  END IF;

  SELECT AVG(score) INTO avg_score
  FROM public.project_ratings WHERE project_id = _project_id AND score IS NOT NULL;

  IF avg_score >= 50 THEN
    SELECT pr.supervisor_id INTO chosen_supervisor
    FROM public.project_ratings pr
    JOIN public.supervisors s ON s.user_id = pr.supervisor_id
    WHERE pr.project_id = _project_id AND pr.score IS NOT NULL
    ORDER BY COALESCE(s.current_projects, 0) ASC, pr.score DESC
    LIMIT 1;

    UPDATE public.projects
    SET supervisor_id = chosen_supervisor,
        status = 'allocated',
        updated_at = now()
    WHERE id = _project_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT chosen_supervisor,
           'New project allocated',
           'A project has been allocated to you (avg rating ' || ROUND(avg_score, 1) || '%).',
           'success',
           '/projects/' || _project_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT student_id,
           'Project allocated',
           'Your project has been approved (avg rating ' || ROUND(avg_score, 1) || '%) and assigned to a supervisor.',
           'success',
           '/projects/' || _project_id
    FROM public.projects WHERE id = _project_id;
  ELSE
    SELECT string_agg('• ' || COALESCE(comment, '(no comment)'), E'\n')
    INTO agg_comments
    FROM public.project_ratings
    WHERE project_id = _project_id AND score IS NOT NULL;

    UPDATE public.projects
    SET status = 'rejected',
        rejection_reason = 'Average supervisor rating ' || ROUND(avg_score, 1) || '% (below 50% threshold).' || E'\n\nFeedback:\n' || COALESCE(agg_comments, ''),
        updated_at = now()
    WHERE id = _project_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT student_id,
           'Project rejected',
           'Your project did not meet the 50% average rating threshold. See feedback for details.',
           'error',
           '/projects/' || _project_id
    FROM public.projects WHERE id = _project_id;
  END IF;
END;
$function$;