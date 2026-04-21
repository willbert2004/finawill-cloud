
-- Chapters: student-defined sections of the dissertation (Intro, Lit Review, etc.)
CREATE TABLE public.project_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft | submitted | needs_revision | approved
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Submissions: every upload of a chapter draft (versioned)
CREATE TABLE public.chapter_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.project_chapters(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  notes text,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Feedback per submission: supervisor written feedback + optional marked-up file
CREATE TABLE public.chapter_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.chapter_submissions(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.project_chapters(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'needs_revision', -- approved | needs_revision | rejected
  comments text NOT NULL,
  marked_file_path text,
  marked_file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_chapters_project ON public.project_chapters(project_id);
CREATE INDEX idx_chapter_submissions_chapter ON public.chapter_submissions(chapter_id);
CREATE INDEX idx_chapter_feedback_submission ON public.chapter_feedback(submission_id);

ALTER TABLE public.project_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_feedback ENABLE ROW LEVEL SECURITY;

-- project_chapters policies
CREATE POLICY "Admins manage chapters" ON public.project_chapters FOR ALL
  USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Students manage their chapters" ON public.project_chapters FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.student_id = auth.uid()));
CREATE POLICY "Supervisors view assigned chapters" ON public.project_chapters FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.supervisor_id = auth.uid()));
CREATE POLICY "Supervisors update chapter status" ON public.project_chapters FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.supervisor_id = auth.uid()));

-- chapter_submissions policies
CREATE POLICY "Admins manage submissions" ON public.chapter_submissions FOR ALL
  USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Students manage their submissions" ON public.chapter_submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.project_chapters c JOIN public.projects p ON p.id = c.project_id WHERE c.id = chapter_id AND p.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_chapters c JOIN public.projects p ON p.id = c.project_id WHERE c.id = chapter_id AND p.student_id = auth.uid()));
CREATE POLICY "Supervisors view assigned submissions" ON public.chapter_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.project_chapters c JOIN public.projects p ON p.id = c.project_id WHERE c.id = chapter_id AND p.supervisor_id = auth.uid()));

-- chapter_feedback policies
CREATE POLICY "Admins manage feedback" ON public.chapter_feedback FOR ALL
  USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Supervisors manage their feedback" ON public.chapter_feedback FOR ALL
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());
CREATE POLICY "Students view feedback on their chapters" ON public.chapter_feedback FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.project_chapters c JOIN public.projects p ON p.id = c.project_id WHERE c.id = chapter_id AND p.student_id = auth.uid()));

-- updated_at trigger
CREATE TRIGGER trg_project_chapters_updated
  BEFORE UPDATE ON public.project_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-bump version on new submission per chapter
CREATE OR REPLACE FUNCTION public.set_chapter_submission_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
  FROM public.chapter_submissions WHERE chapter_id = NEW.chapter_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_chapter_submission_version
  BEFORE INSERT ON public.chapter_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_chapter_submission_version();

-- When student submits, mark chapter status & notify supervisor
CREATE OR REPLACE FUNCTION public.notify_supervisor_on_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  proj RECORD;
  chap RECORD;
BEGIN
  SELECT c.title, p.id AS project_id, p.title AS project_title, p.supervisor_id
  INTO chap
  FROM public.project_chapters c
  JOIN public.projects p ON p.id = c.project_id
  WHERE c.id = NEW.chapter_id;

  UPDATE public.project_chapters SET status = 'submitted', updated_at = now()
  WHERE id = NEW.chapter_id;

  IF chap.supervisor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (chap.supervisor_id,
            'New chapter submission',
            'Chapter "' || chap.title || '" (v' || NEW.version || ') was submitted for "' || chap.project_title || '". Please review.',
            'info',
            '/project-management?project=' || chap.project_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_supervisor_on_submission
  AFTER INSERT ON public.chapter_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_supervisor_on_submission();

-- When supervisor leaves feedback, update chapter status & notify student
CREATE OR REPLACE FUNCTION public.notify_student_on_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chap RECORD;
BEGIN
  SELECT c.title, p.id AS project_id, p.title AS project_title, p.student_id
  INTO chap
  FROM public.project_chapters c
  JOIN public.projects p ON p.id = c.project_id
  WHERE c.id = NEW.chapter_id;

  UPDATE public.project_chapters SET status = NEW.status, updated_at = now()
  WHERE id = NEW.chapter_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (chap.student_id,
          'Feedback on ' || chap.title,
          'Your supervisor marked "' || chap.title || '" as ' || REPLACE(NEW.status, '_', ' ') || '. Open to view comments.',
          CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
          '/project-management?project=' || chap.project_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_student_on_feedback
  AFTER INSERT ON public.chapter_feedback
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_feedback();

-- Storage bucket for chapter files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-chapters', 'project-chapters', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path is `${project_id}/${chapter_id}/${filename}`
CREATE POLICY "Students upload to their project chapters" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-chapters'
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[1] AND p.student_id = auth.uid())
  );
CREATE POLICY "Supervisors upload marked-up files" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-chapters'
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[1] AND p.supervisor_id = auth.uid())
  );
CREATE POLICY "Students read their chapter files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-chapters'
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[1] AND p.student_id = auth.uid())
  );
CREATE POLICY "Supervisors read assigned chapter files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-chapters'
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[1] AND p.supervisor_id = auth.uid())
  );
CREATE POLICY "Admins manage chapter files" ON storage.objects FOR ALL
  USING (bucket_id = 'project-chapters' AND is_admin_or_super(auth.uid()));
CREATE POLICY "Students delete their chapter files" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-chapters'
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[1] AND p.student_id = auth.uid())
  );
