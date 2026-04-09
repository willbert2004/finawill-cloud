-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);

-- Storage policies for project documents
CREATE POLICY "Students can upload their project documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view their project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can delete their project documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Supervisors can view assigned project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.supervisor_id = auth.uid() 
  AND p.student_id::text = (storage.foldername(name))[1]
));

CREATE POLICY "Admins can view all project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'
));

-- Create project documents table with versioning
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  document_type TEXT NOT NULL DEFAULT 'proposal',
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their project documents"
ON public.project_documents FOR ALL
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.student_id = auth.uid()));

CREATE POLICY "Supervisors can view assigned project documents"
ON public.project_documents FOR SELECT
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.supervisor_id = auth.uid()));

CREATE POLICY "Admins can manage all project documents"
ON public.project_documents FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- Create project phases table for timeline
CREATE TABLE public.project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their project phases"
ON public.project_phases FOR ALL
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.student_id = auth.uid()));

CREATE POLICY "Supervisors can view and update assigned project phases"
ON public.project_phases FOR ALL
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.supervisor_id = auth.uid()));

CREATE POLICY "Admins can manage all project phases"
ON public.project_phases FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- Create supervisor feedback table
CREATE TABLE public.supervisor_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL,
  document_id UUID REFERENCES public.project_documents(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supervisor_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view feedback on their projects"
ON public.supervisor_feedback FOR SELECT
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.student_id = auth.uid()));

CREATE POLICY "Supervisors can manage feedback on assigned projects"
ON public.supervisor_feedback FOR ALL
USING (supervisor_id = auth.uid() OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.supervisor_id = auth.uid()));

CREATE POLICY "Admins can manage all feedback"
ON public.supervisor_feedback FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_project_phases_updated_at
BEFORE UPDATE ON public.project_phases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supervisor_feedback_updated_at
BEFORE UPDATE ON public.supervisor_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notify student when supervisor adds feedback
CREATE OR REPLACE FUNCTION public.notify_student_on_feedback()
RETURNS TRIGGER AS $$
DECLARE
  student_user_id UUID;
BEGIN
  SELECT student_id INTO student_user_id FROM public.projects WHERE id = NEW.project_id;
  
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    student_user_id,
    'New Supervisor Feedback',
    'Your supervisor has provided feedback: ' || NEW.title,
    'feedback',
    '/project-management'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_feedback_created
AFTER INSERT ON public.supervisor_feedback
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_on_feedback();