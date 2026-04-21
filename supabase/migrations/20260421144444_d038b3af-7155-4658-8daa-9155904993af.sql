
-- Function: when all chapters of a project are approved (and there are at least 6),
-- mark the project as 'finalized' and notify the student + supervisor.
CREATE OR REPLACE FUNCTION public.finalize_project_when_chapters_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_chapters integer;
  approved_chapters integer;
  proj RECORD;
BEGIN
  -- Only react when a chapter becomes approved
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) FILTER (WHERE TRUE),
         COUNT(*) FILTER (WHERE status = 'approved')
  INTO total_chapters, approved_chapters
  FROM public.project_chapters
  WHERE project_id = NEW.project_id;

  IF total_chapters >= 6 AND approved_chapters = total_chapters THEN
    SELECT id, title, student_id, supervisor_id, status
    INTO proj
    FROM public.projects
    WHERE id = NEW.project_id;

    IF proj.id IS NULL OR proj.status = 'finalized' THEN
      RETURN NEW;
    END IF;

    UPDATE public.projects
    SET status = 'finalized', updated_at = now()
    WHERE id = proj.id;

    -- Notify student to compile and submit final zip
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      proj.student_id,
      'Project ready for final submission',
      'All chapters of "' || proj.title || '" have been approved. Please compile and upload a single ZIP file containing the final documentation and prototype.',
      'success',
      '/project-management?project=' || proj.id
    );

    -- Notify supervisor (if any)
    IF proj.supervisor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        proj.supervisor_id,
        'Project finalized',
        '"' || proj.title || '" has all chapters approved and is now awaiting the student''s final ZIP submission.',
        'info',
        '/project-management?project=' || proj.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finalize_project_when_chapters_approved ON public.project_chapters;
CREATE TRIGGER trg_finalize_project_when_chapters_approved
AFTER UPDATE OF status ON public.project_chapters
FOR EACH ROW
EXECUTE FUNCTION public.finalize_project_when_chapters_approved();
