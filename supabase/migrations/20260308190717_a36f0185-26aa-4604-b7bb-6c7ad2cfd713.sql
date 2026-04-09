
-- Allow supervisors to insert and manage documents on their assigned projects
CREATE POLICY "Supervisors can manage assigned project documents"
ON public.project_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_documents.project_id
    AND p.supervisor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_documents.project_id
    AND p.supervisor_id = auth.uid()
  )
);

-- Drop the old SELECT-only policy for supervisors since the new ALL policy covers it
DROP POLICY IF EXISTS "Supervisors can view assigned project documents" ON public.project_documents;
