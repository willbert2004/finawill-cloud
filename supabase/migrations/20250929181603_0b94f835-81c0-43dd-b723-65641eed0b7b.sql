-- Add admin role to user_type enum by recreating the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IN ('student', 'supervisor', 'admin'));

-- Add new fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS document_url VARCHAR(500);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Update status constraint to include new statuses
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('pending', 'idea', 'in-progress', 'approved', 'finalized', 'archived'));

-- Create project_revisions table for versioning
CREATE TABLE IF NOT EXISTS project_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  document_url VARCHAR(500),
  revised_by UUID NOT NULL,
  revised_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revision_number INTEGER NOT NULL,
  change_notes TEXT
);

-- Enable RLS on project_revisions
ALTER TABLE project_revisions ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department);
CREATE INDEX IF NOT EXISTS idx_projects_year ON projects(year);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_revisions_project_id ON project_revisions(project_id);

-- RLS Policies for Admins (full access to all projects)
CREATE POLICY "Admins can view all projects" ON projects
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);

CREATE POLICY "Admins can insert projects" ON projects
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);

CREATE POLICY "Admins can update all projects" ON projects
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);

CREATE POLICY "Admins can delete projects" ON projects
FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);

-- Update existing policies to prevent editing finalized projects
CREATE POLICY "Students cannot edit finalized projects" ON projects
FOR UPDATE USING (
  student_id = auth.uid() AND status NOT IN ('finalized', 'archived')
);

CREATE POLICY "Supervisors cannot edit finalized projects" ON projects
FOR UPDATE USING (
  (supervisor_id = auth.uid() OR (supervisor_id IS NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'
  ))) AND status NOT IN ('finalized', 'archived')
);

-- RLS Policies for project_revisions
CREATE POLICY "Users can view revisions of their projects" ON project_revisions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_revisions.project_id 
    AND (projects.student_id = auth.uid() OR projects.supervisor_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);

CREATE POLICY "Users can create revisions for non-finalized projects" ON project_revisions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_revisions.project_id 
    AND projects.student_id = auth.uid()
    AND projects.status NOT IN ('finalized', 'archived')
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);

-- Function to automatically create revision on project update
CREATE OR REPLACE FUNCTION create_project_revision()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.title != NEW.title OR OLD.description != NEW.description OR OLD.document_url != NEW.document_url THEN
    INSERT INTO project_revisions (
      project_id, 
      title, 
      description, 
      document_url, 
      revised_by, 
      revision_number,
      change_notes
    )
    VALUES (
      OLD.id,
      OLD.title,
      OLD.description,
      OLD.document_url,
      auth.uid(),
      (SELECT COALESCE(MAX(revision_number), 0) + 1 FROM project_revisions WHERE project_id = OLD.id),
      'Automatic revision on update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create revision before update
CREATE TRIGGER project_update_revision
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_revision();