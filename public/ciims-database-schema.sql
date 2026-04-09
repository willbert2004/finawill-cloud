-- ============================================================
-- CIIMS - Capstone Innovation & Idea Management System
-- Complete Database Schema Export
-- Generated: 2026-03-06
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'student', 'supervisor');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Profiles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email text NOT NULL,
    user_type text NOT NULL,
    full_name text,
    school text,
    department text,
    research_areas text[],
    max_projects integer DEFAULT 5,
    current_projects integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Students
CREATE TABLE public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    student_number text,
    department text,
    school text,
    year_of_study integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Supervisors
CREATE TABLE public.supervisors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    department text,
    office_location text,
    research_areas text[],
    max_projects integer DEFAULT 5,
    current_projects integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    objectives text,
    student_id uuid NOT NULL,
    supervisor_id uuid,
    status text NOT NULL DEFAULT 'pending',
    keywords text[],
    department varchar,
    document_url varchar,
    similarity_score numeric DEFAULT 0.00,
    is_duplicate boolean DEFAULT false,
    rejection_reason text,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Project Revisions
CREATE TABLE public.project_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id),
    title text NOT NULL,
    description text NOT NULL,
    document_url varchar,
    revised_by uuid NOT NULL,
    revision_number integer NOT NULL,
    change_notes text,
    revised_at timestamptz NOT NULL DEFAULT now()
);

-- Project Documents
CREATE TABLE public.project_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id),
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size integer,
    document_type text NOT NULL DEFAULT 'proposal',
    description text,
    uploaded_by uuid NOT NULL,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Project Phases
CREATE TABLE public.project_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id),
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'pending',
    progress integer NOT NULL DEFAULT 0,
    order_index integer NOT NULL DEFAULT 0,
    start_date date,
    end_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student Groups
CREATE TABLE public.student_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    department text,
    project_type text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group Members
CREATE TABLE public.group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.student_groups(id),
    student_id uuid,
    full_name text,
    reg_number text,
    joined_at timestamptz NOT NULL DEFAULT now()
);

-- Group Milestones
CREATE TABLE public.group_milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.student_groups(id),
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'pending',
    due_date date,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Milestone Updates
CREATE TABLE public.milestone_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id uuid NOT NULL REFERENCES public.group_milestones(id),
    update_text text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Group Allocations
CREATE TABLE public.group_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.student_groups(id),
    supervisor_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    match_score numeric DEFAULT 0.00,
    match_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Pending Allocations
CREATE TABLE public.pending_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id),
    supervisor_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    match_score numeric DEFAULT 0.00,
    match_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allocation Rules
CREATE TABLE public.allocation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name text NOT NULL,
    rule_value integer NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Supervisor Feedback
CREATE TABLE public.supervisor_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id),
    supervisor_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    feedback_type text NOT NULL DEFAULT 'general',
    rating integer,
    document_id uuid REFERENCES public.project_documents(id),
    phase_id uuid REFERENCES public.project_phases(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    read boolean NOT NULL DEFAULT false,
    link text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- 3. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.supervisor_directory AS
SELECT
    p.id, p.user_id, p.full_name, p.user_type, p.department, p.school,
    p.research_areas, p.max_projects, p.current_projects,
    p.created_at, p.updated_at
FROM public.profiles p
WHERE p.user_type = 'supervisor';

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is a supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND user_type = 'supervisor'
  )
$$;

-- Check if user owns a group
CREATE OR REPLACE FUNCTION public.user_owns_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_groups
    WHERE id = _group_id AND created_by = _user_id
  )
$$;

-- Handle new user signup (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  INSERT INTO public.profiles (user_id, email, user_type, full_name, school, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'department'
  );
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student')::app_role;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);
  RETURN NEW;
END;
$$;

-- Handle profile user type (creates student/supervisor record)
CREATE OR REPLACE FUNCTION public.handle_profile_user_type()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.students (user_id, department, school)
    VALUES (NEW.user_id, NEW.department, NEW.school)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.user_type = 'supervisor' THEN
    INSERT INTO public.supervisors (user_id, research_areas, department)
    VALUES (NEW.user_id, NEW.research_areas, NEW.department)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create project revision on update
CREATE OR REPLACE FUNCTION public.create_project_revision()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.title != NEW.title OR OLD.description != NEW.description OR OLD.document_url != NEW.document_url THEN
    INSERT INTO project_revisions (project_id, title, description, document_url, revised_by, revision_number, change_notes)
    VALUES (
      OLD.id, OLD.title, OLD.description, OLD.document_url, auth.uid(),
      (SELECT COALESCE(MAX(revision_number), 0) + 1 FROM project_revisions WHERE project_id = OLD.id),
      'Automatic revision on update'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Update supervisor project count
CREATE OR REPLACE FUNCTION public.update_supervisor_project_count()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles SET current_projects = (
        SELECT COUNT(*) FROM public.projects
        WHERE supervisor_id = NEW.supervisor_id AND status NOT IN ('archived', 'rejected')
      ) WHERE user_id = NEW.supervisor_id;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.supervisor_id IS DISTINCT FROM NEW.supervisor_id THEN
    IF OLD.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles SET current_projects = (
        SELECT COUNT(*) FROM public.projects
        WHERE supervisor_id = OLD.supervisor_id AND status NOT IN ('archived', 'rejected')
      ) WHERE user_id = OLD.supervisor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Notify supervisor on allocation
CREATE OR REPLACE FUNCTION public.notify_supervisor_on_allocation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.supervisor_id,
    'New Allocation Request',
    'You have a new group allocation request pending your review.',
    'allocation',
    '/allocation'
  );
  RETURN NEW;
END;
$$;

-- Notify student on allocation response
CREATE OR REPLACE FUNCTION public.notify_student_on_allocation_response()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  group_creator UUID;
  status_msg TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    SELECT created_by INTO group_creator FROM public.student_groups WHERE id = NEW.group_id;
    IF NEW.status = 'accepted' THEN
      status_msg := 'Your group allocation request has been accepted!';
    ELSE
      status_msg := 'Your group allocation request has been declined.';
    END IF;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (group_creator, 'Allocation ' || INITCAP(NEW.status), status_msg, 'allocation', '/student-groups');
  END IF;
  RETURN NEW;
END;
$$;

-- Notify group on milestone
CREATE OR REPLACE FUNCTION public.notify_group_on_milestone()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  member RECORD;
BEGIN
  FOR member IN SELECT student_id FROM public.group_members WHERE group_id = NEW.group_id AND student_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (member.student_id, 'New Milestone Added', 'A new milestone "' || NEW.title || '" has been added to your group.', 'milestone', '/student-groups');
  END LOOP;
  RETURN NEW;
END;
$$;

-- Notify student on feedback
CREATE OR REPLACE FUNCTION public.notify_student_on_feedback()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  student_user_id UUID;
BEGIN
  SELECT student_id INTO student_user_id FROM public.projects WHERE id = NEW.project_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (student_user_id, 'New Supervisor Feedback', 'Your supervisor has provided feedback: ' || NEW.title, 'feedback', '/project-management');
  RETURN NEW;
END;
$$;

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Auth trigger (on auth.users insert)
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile user type trigger
-- CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.handle_profile_user_type();

-- Project revision trigger
-- CREATE TRIGGER on_project_updated BEFORE UPDATE ON public.projects
--   FOR EACH ROW EXECUTE FUNCTION public.create_project_revision();

-- Supervisor project count trigger
-- CREATE TRIGGER on_project_supervisor_change AFTER INSERT OR UPDATE ON public.projects
--   FOR EACH ROW EXECUTE FUNCTION public.update_supervisor_project_count();

-- Notification triggers
-- CREATE TRIGGER on_group_allocation_created AFTER INSERT ON public.group_allocations
--   FOR EACH ROW EXECUTE FUNCTION public.notify_supervisor_on_allocation();

-- CREATE TRIGGER on_group_allocation_response AFTER UPDATE ON public.group_allocations
--   FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_allocation_response();

-- CREATE TRIGGER on_milestone_created AFTER INSERT ON public.group_milestones
--   FOR EACH ROW EXECUTE FUNCTION public.notify_group_on_milestone();

-- CREATE TRIGGER on_feedback_created AFTER INSERT ON public.supervisor_feedback
--   FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_feedback();

-- Updated_at triggers
-- CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- (repeat for: projects, supervisors, students, student_groups, group_milestones,
--  project_phases, group_allocations, pending_allocations, allocation_rules, supervisor_feedback)

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ===================== PROFILES =====================
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Supervisors can view other supervisors profiles" ON public.profiles FOR SELECT USING (is_supervisor(auth.uid()) AND user_type = 'supervisor');

-- ===================== USER ROLES =====================
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ===================== STUDENTS =====================
CREATE POLICY "Students can view their own record" ON public.students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Students can insert their own record" ON public.students FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Students can update their own record" ON public.students FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all students" ON public.students FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Admins can view all students" ON public.students FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Supervisors can view all students" ON public.students FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'));

-- ===================== SUPERVISORS =====================
CREATE POLICY "Supervisors can view their own record" ON public.supervisors FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Supervisors can insert their own record" ON public.supervisors FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Supervisors can update their own record" ON public.supervisors FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Supervisors can view all supervisors" ON public.supervisors FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'));
CREATE POLICY "Students can view all supervisors" ON public.supervisors FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'student'));
CREATE POLICY "Admins can manage all supervisors" ON public.supervisors FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Admins can view all supervisors" ON public.supervisors FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== PROJECTS =====================
CREATE POLICY "Students can view their own projects" ON public.projects FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert their own projects" ON public.projects FOR INSERT WITH CHECK (student_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'student'));
CREATE POLICY "Students cannot edit finalized projects" ON public.projects FOR UPDATE USING (student_id = auth.uid() AND status NOT IN ('finalized', 'archived'));
CREATE POLICY "Supervisors can view all projects for assignment" ON public.projects FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'));
CREATE POLICY "Supervisors can view assigned projects" ON public.projects FOR SELECT USING (supervisor_id = auth.uid());
CREATE POLICY "Supervisors can update assigned projects" ON public.projects FOR UPDATE USING (supervisor_id = auth.uid() OR (supervisor_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor')));
CREATE POLICY "Supervisors cannot edit finalized projects" ON public.projects FOR UPDATE USING ((supervisor_id = auth.uid() OR (supervisor_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'))) AND status NOT IN ('finalized', 'archived'));
CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Admins can insert projects" ON public.projects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Admins can update all projects" ON public.projects FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== PROJECT REVISIONS =====================
CREATE POLICY "Users can view revisions of their projects" ON public.project_revisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_revisions.project_id AND (student_id = auth.uid() OR supervisor_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);
CREATE POLICY "Users can create revisions for non-finalized projects" ON public.project_revisions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE id = project_revisions.project_id AND student_id = auth.uid() AND status NOT IN ('finalized', 'archived'))
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
);

-- ===================== PROJECT DOCUMENTS =====================
CREATE POLICY "Students can manage their project documents" ON public.project_documents FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_documents.project_id AND p.student_id = auth.uid()));
CREATE POLICY "Supervisors can view assigned project documents" ON public.project_documents FOR SELECT USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_documents.project_id AND p.supervisor_id = auth.uid()));
CREATE POLICY "Admins can manage all project documents" ON public.project_documents FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== PROJECT PHASES =====================
CREATE POLICY "Students can manage their project phases" ON public.project_phases FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.student_id = auth.uid()));
CREATE POLICY "Supervisors can view and update assigned project phases" ON public.project_phases FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.supervisor_id = auth.uid()));
CREATE POLICY "Admins can manage all project phases" ON public.project_phases FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== STUDENT GROUPS =====================
CREATE POLICY "Students can create groups" ON public.student_groups FOR INSERT WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'student'));
CREATE POLICY "Students can view groups they created" ON public.student_groups FOR SELECT USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Students can view their groups" ON public.student_groups FOR SELECT USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = student_groups.id AND gm.student_id = auth.uid()));
CREATE POLICY "Supervisors can view all groups" ON public.student_groups FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'));
CREATE POLICY "Supervisors can delete groups" ON public.student_groups FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'));
CREATE POLICY "Admins can manage all groups" ON public.student_groups FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== GROUP MEMBERS =====================
CREATE POLICY "Students can view their group memberships" ON public.group_members FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert members into their groups" ON public.group_members FOR INSERT WITH CHECK (user_owns_group(auth.uid(), group_id));
CREATE POLICY "Supervisors can view all group members" ON public.group_members FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor'));
CREATE POLICY "Admins can manage all group members" ON public.group_members FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== GROUP MILESTONES =====================
CREATE POLICY "Group creators can view milestones" ON public.group_milestones FOR SELECT USING (EXISTS (SELECT 1 FROM student_groups sg WHERE sg.id = group_milestones.group_id AND sg.created_by = auth.uid()));
CREATE POLICY "Students can view milestones for their groups" ON public.group_milestones FOR SELECT USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_milestones.group_id AND gm.student_id = auth.uid()));
CREATE POLICY "Supervisors can manage milestones for their groups" ON public.group_milestones FOR ALL USING (EXISTS (SELECT 1 FROM group_allocations ga WHERE ga.group_id = group_milestones.group_id AND ga.supervisor_id = auth.uid() AND ga.status = 'accepted'));

-- ===================== MILESTONE UPDATES =====================
CREATE POLICY "Group creators can manage milestone updates" ON public.milestone_updates FOR ALL USING (EXISTS (SELECT 1 FROM group_milestones gm JOIN student_groups sg ON sg.id = gm.group_id WHERE gm.id = milestone_updates.milestone_id AND sg.created_by = auth.uid()));
CREATE POLICY "Students can view and add updates for their group milestones" ON public.milestone_updates FOR ALL USING (EXISTS (SELECT 1 FROM group_milestones gm JOIN group_members gmem ON gmem.group_id = gm.group_id WHERE gm.id = milestone_updates.milestone_id AND gmem.student_id = auth.uid()));
CREATE POLICY "Supervisors can manage updates for their milestones" ON public.milestone_updates FOR ALL USING (EXISTS (SELECT 1 FROM group_milestones gm JOIN group_allocations ga ON ga.group_id = gm.group_id WHERE gm.id = milestone_updates.milestone_id AND ga.supervisor_id = auth.uid() AND ga.status = 'accepted'));

-- ===================== GROUP ALLOCATIONS =====================
CREATE POLICY "Students can view their group allocations" ON public.group_allocations FOR SELECT USING (EXISTS (SELECT 1 FROM student_groups sg WHERE sg.id = group_allocations.group_id AND sg.created_by = auth.uid()));
CREATE POLICY "Students can insert group allocations" ON public.group_allocations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.user_type = 'student')
  AND EXISTS (SELECT 1 FROM student_groups sg WHERE sg.id = group_allocations.group_id AND sg.created_by = auth.uid())
);
CREATE POLICY "Supervisors can view their group allocations" ON public.group_allocations FOR SELECT USING (supervisor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Supervisors can update their group allocations" ON public.group_allocations FOR UPDATE USING (supervisor_id = auth.uid());
CREATE POLICY "Admins can manage all group allocations" ON public.group_allocations FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== PENDING ALLOCATIONS =====================
CREATE POLICY "Supervisors can view their pending allocations" ON public.pending_allocations FOR SELECT USING (supervisor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Supervisors can update their pending allocations" ON public.pending_allocations FOR UPDATE USING (supervisor_id = auth.uid()) WITH CHECK (supervisor_id = auth.uid());
CREATE POLICY "Admins can manage all pending allocations" ON public.pending_allocations FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== ALLOCATION RULES =====================
CREATE POLICY "Admins can manage allocation rules" ON public.allocation_rules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Supervisors can view allocation rules" ON public.allocation_rules FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type IN ('supervisor', 'admin')));

-- ===================== SUPERVISOR FEEDBACK =====================
CREATE POLICY "Supervisors can manage feedback on assigned projects" ON public.supervisor_feedback FOR ALL USING (supervisor_id = auth.uid() OR EXISTS (SELECT 1 FROM projects p WHERE p.id = supervisor_feedback.project_id AND p.supervisor_id = auth.uid()));
CREATE POLICY "Students can view feedback on their projects" ON public.supervisor_feedback FOR SELECT USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = supervisor_feedback.project_id AND p.student_id = auth.uid()));
CREATE POLICY "Admins can manage all feedback" ON public.supervisor_feedback FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- ===================== NOTIFICATIONS =====================
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users or admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. STORAGE BUCKETS
-- ============================================================

-- Create private bucket for project documents
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
