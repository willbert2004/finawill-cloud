
-- Create a helper function that checks if user is admin OR super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  )
$$;

-- PROFILES
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin_or_super(auth.uid()));

-- PROJECTS
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
CREATE POLICY "Admins can update all projects" ON public.projects FOR UPDATE USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
CREATE POLICY "Admins can insert projects" ON public.projects FOR INSERT WITH CHECK (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING (is_admin_or_super(auth.uid()));

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (is_admin_or_super(auth.uid()));

-- STUDENT_GROUPS
DROP POLICY IF EXISTS "Admins can manage all groups" ON public.student_groups;
CREATE POLICY "Admins can manage all groups" ON public.student_groups FOR ALL USING (is_admin_or_super(auth.uid()));

-- GROUP_MEMBERS
DROP POLICY IF EXISTS "Admins can manage all members" ON public.group_members;
CREATE POLICY "Admins can manage all members" ON public.group_members FOR ALL USING (is_admin_or_super(auth.uid()));

-- GROUP_ALLOCATIONS
DROP POLICY IF EXISTS "Admins can manage all allocations" ON public.group_allocations;
CREATE POLICY "Admins can manage all allocations" ON public.group_allocations FOR ALL USING (is_admin_or_super(auth.uid()));

-- GROUP_MILESTONES
DROP POLICY IF EXISTS "Admins can manage all milestones" ON public.group_milestones;
CREATE POLICY "Admins can manage all milestones" ON public.group_milestones FOR ALL USING (is_admin_or_super(auth.uid()));

-- MEETINGS
DROP POLICY IF EXISTS "Admins can manage all meetings" ON public.meetings;
CREATE POLICY "Admins can manage all meetings" ON public.meetings FOR ALL USING (is_admin_or_super(auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK ((user_id = auth.uid()) OR is_admin_or_super(auth.uid()));

-- STUDENTS
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
CREATE POLICY "Admins can manage all students" ON public.students FOR ALL USING (is_admin_or_super(auth.uid()));

-- SUPERVISORS
DROP POLICY IF EXISTS "Admins can manage all supervisors" ON public.supervisors;
CREATE POLICY "Admins can manage all supervisors" ON public.supervisors FOR ALL USING (is_admin_or_super(auth.uid()));

-- SUPERVISOR_FEEDBACK
DROP POLICY IF EXISTS "Admins can manage all feedback" ON public.supervisor_feedback;
CREATE POLICY "Admins can manage all feedback" ON public.supervisor_feedback FOR ALL USING (is_admin_or_super(auth.uid()));

-- PROJECT_DOCUMENTS
DROP POLICY IF EXISTS "Admins can manage all project docs" ON public.project_documents;
CREATE POLICY "Admins can manage all project docs" ON public.project_documents FOR ALL USING (is_admin_or_super(auth.uid()));

-- PROJECT_PHASES
DROP POLICY IF EXISTS "Admins can manage all phases" ON public.project_phases;
CREATE POLICY "Admins can manage all phases" ON public.project_phases FOR ALL USING (is_admin_or_super(auth.uid()));

-- PENDING_ALLOCATIONS
DROP POLICY IF EXISTS "Admins can manage all pending" ON public.pending_allocations;
CREATE POLICY "Admins can manage all pending" ON public.pending_allocations FOR ALL USING (is_admin_or_super(auth.uid()));

-- ALLOCATION_RULES
DROP POLICY IF EXISTS "Admins can manage rules" ON public.allocation_rules;
CREATE POLICY "Admins can manage rules" ON public.allocation_rules FOR ALL USING (is_admin_or_super(auth.uid()));

-- AUDIT_LOG
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit log" ON public.audit_log;
CREATE POLICY "Admins can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (is_admin_or_super(auth.uid()));

-- PHASE_TEMPLATES
DROP POLICY IF EXISTS "Admins can manage templates" ON public.phase_templates;
CREATE POLICY "Admins can manage templates" ON public.phase_templates FOR ALL USING (is_admin_or_super(auth.uid()));

-- SCHOOLS
DROP POLICY IF EXISTS "Admins can manage schools" ON public.schools;
CREATE POLICY "Admins can manage schools" ON public.schools FOR ALL USING (is_admin_or_super(auth.uid()));

-- DEPARTMENTS
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (is_admin_or_super(auth.uid()));
