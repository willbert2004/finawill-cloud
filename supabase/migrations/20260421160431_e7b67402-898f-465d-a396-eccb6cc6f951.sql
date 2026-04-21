-- Make related records cascade when a project is deleted
ALTER TABLE public.pending_allocations
  DROP CONSTRAINT IF EXISTS pending_allocations_project_id_fkey,
  ADD CONSTRAINT pending_allocations_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_ratings
  DROP CONSTRAINT IF EXISTS project_ratings_project_id_fkey,
  ADD CONSTRAINT project_ratings_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_chapters
  DROP CONSTRAINT IF EXISTS project_chapters_project_id_fkey,
  ADD CONSTRAINT project_chapters_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_documents
  DROP CONSTRAINT IF EXISTS project_documents_project_id_fkey,
  ADD CONSTRAINT project_documents_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_phases
  DROP CONSTRAINT IF EXISTS project_phases_project_id_fkey,
  ADD CONSTRAINT project_phases_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_revisions
  DROP CONSTRAINT IF EXISTS project_revisions_project_id_fkey,
  ADD CONSTRAINT project_revisions_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.supervisor_feedback
  DROP CONSTRAINT IF EXISTS supervisor_feedback_project_id_fkey,
  ADD CONSTRAINT supervisor_feedback_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;