-- 1. Create project_ratings table
CREATE TABLE public.project_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL,
  score integer,
  comment text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'rated'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (project_id, supervisor_id),
  CONSTRAINT score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX idx_project_ratings_project ON public.project_ratings(project_id);
CREATE INDEX idx_project_ratings_supervisor ON public.project_ratings(supervisor_id);

ALTER TABLE public.project_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all ratings"
ON public.project_ratings FOR ALL
USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Supervisors can view their assigned ratings"
ON public.project_ratings FOR SELECT
USING (supervisor_id = auth.uid());

CREATE POLICY "Supervisors can update their assigned ratings"
ON public.project_ratings FOR UPDATE
USING (supervisor_id = auth.uid());

CREATE POLICY "Supervisors can insert ratings (system)"
ON public.project_ratings FOR INSERT
WITH CHECK (public.is_supervisor(auth.uid()) OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "Students can view ratings on their projects"
ON public.project_ratings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_ratings.project_id AND p.student_id = auth.uid()
));

-- updated_at trigger
CREATE TRIGGER update_project_ratings_updated_at
BEFORE UPDATE ON public.project_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Function to seed matching supervisor ratings for a project
CREATE OR REPLACE FUNCTION public.seed_project_ratings(_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proj RECORD;
  inserted_count integer := 0;
BEGIN
  SELECT id, keywords, department INTO proj FROM public.projects WHERE id = _project_id;
  IF proj.id IS NULL THEN RETURN 0; END IF;

  -- Insert one pending rating per matching supervisor (overlap research_areas with project keywords)
  INSERT INTO public.project_ratings (project_id, supervisor_id, status)
  SELECT _project_id, s.user_id, 'pending'
  FROM public.supervisors s
  WHERE s.research_areas && COALESCE(proj.keywords, ARRAY[]::text[])
  ON CONFLICT (project_id, supervisor_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Fallback: if no overlap matches, send to all supervisors in the same department
  IF inserted_count = 0 AND proj.department IS NOT NULL THEN
    INSERT INTO public.project_ratings (project_id, supervisor_id, status)
    SELECT _project_id, s.user_id, 'pending'
    FROM public.supervisors s
    WHERE s.department = proj.department
    ON CONFLICT (project_id, supervisor_id) DO NOTHING;
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
  END IF;

  RETURN inserted_count;
END;
$$;

-- 3. Function to finalize allocation once all ratings are in
CREATE OR REPLACE FUNCTION public.finalize_project_allocation(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RETURN; -- not all ratings collected yet
  END IF;

  SELECT AVG(score) INTO avg_score
  FROM public.project_ratings WHERE project_id = _project_id AND score IS NOT NULL;

  IF avg_score >= 50 THEN
    -- Pick the matching supervisor with the lowest current workload
    SELECT pr.supervisor_id INTO chosen_supervisor
    FROM public.project_ratings pr
    JOIN public.supervisors s ON s.user_id = pr.supervisor_id
    WHERE pr.project_id = _project_id AND pr.score IS NOT NULL
    ORDER BY COALESCE(s.current_projects, 0) ASC, pr.score DESC
    LIMIT 1;

    UPDATE public.projects
    SET supervisor_id = chosen_supervisor,
        status = 'allocated',
        similarity_score = avg_score,
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
    -- Aggregate comments for rejection reason
    SELECT string_agg('• ' || COALESCE(comment, '(no comment)'), E'\n')
    INTO agg_comments
    FROM public.project_ratings
    WHERE project_id = _project_id AND score IS NOT NULL;

    UPDATE public.projects
    SET status = 'rejected',
        rejection_reason = 'Average supervisor rating ' || ROUND(avg_score, 1) || '% (below 50% threshold).' || E'\n\nFeedback:\n' || COALESCE(agg_comments, ''),
        similarity_score = avg_score,
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
$$;

-- 4. Trigger that runs finalize after each rating update
CREATE OR REPLACE FUNCTION public.trg_after_rating_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rated' THEN
    PERFORM public.finalize_project_allocation(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_ratings_finalize
AFTER INSERT OR UPDATE ON public.project_ratings
FOR EACH ROW EXECUTE FUNCTION public.trg_after_rating_change();