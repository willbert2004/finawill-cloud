
-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'student', 'supervisor');

-- 2. TABLES

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
    avatar_url text,
    phone_number text,
    office_hours text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

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

CREATE TABLE public.group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.student_groups(id),
    student_id uuid,
    full_name text,
    reg_number text,
    joined_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE public.milestone_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id uuid NOT NULL REFERENCES public.group_milestones(id),
    update_text text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE public.allocation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name text NOT NULL,
    rule_value integer NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE public.meetings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id uuid NOT NULL,
    student_id uuid,
    group_id uuid REFERENCES public.student_groups(id),
    title text NOT NULL,
    description text,
    meeting_date date NOT NULL,
    meeting_time time,
    meeting_link text,
    status text NOT NULL DEFAULT 'scheduled',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.schools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    school_id uuid NOT NULL REFERENCES public.schools(id),
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.phase_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    default_duration_days integer DEFAULT 14,
    order_index integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    target_user_id uuid,
    old_values jsonb,
    new_values jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. VIEWS
CREATE OR REPLACE VIEW public.supervisor_directory AS
SELECT p.id, p.user_id, p.full_name, p.user_type, p.department, p.school,
       p.research_areas, p.max_projects, p.current_projects, p.created_at, p.updated_at
FROM public.profiles p WHERE p.user_type = 'supervisor';

-- 4. FUNCTIONS

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_supervisor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND user_type = 'supervisor') $$;

CREATE OR REPLACE FUNCTION public.user_owns_group(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.student_groups WHERE id = _group_id AND created_by = _user_id) $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE user_role_val app_role;
BEGIN
  INSERT INTO public.profiles (user_id, email, user_type, full_name, school, department)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'department');
  user_role_val := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student')::app_role;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role_val);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_profile_user_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.students (user_id, department, school) VALUES (NEW.user_id, NEW.department, NEW.school) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.user_type = 'supervisor' THEN
    INSERT INTO public.supervisors (user_id, research_areas, department) VALUES (NEW.user_id, NEW.research_areas, NEW.department) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_supervisor_project_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = NEW.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = NEW.supervisor_id;
      UPDATE public.supervisors SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = NEW.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = NEW.supervisor_id;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.supervisor_id IS DISTINCT FROM NEW.supervisor_id THEN
    IF OLD.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = OLD.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = OLD.supervisor_id;
      UPDATE public.supervisors SET current_projects = (SELECT COUNT(*) FROM public.projects WHERE supervisor_id = OLD.supervisor_id AND status NOT IN ('archived','rejected')) WHERE user_id = OLD.supervisor_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- 5. TRIGGERS
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_profile_user_type();
CREATE TRIGGER on_project_supervisor_change AFTER INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_supervisor_project_count();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supervisors_updated_at BEFORE UPDATE ON public.supervisors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_groups_updated_at BEFORE UPDATE ON public.student_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_group_milestones_updated_at BEFORE UPDATE ON public.group_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON public.project_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_group_allocations_updated_at BEFORE UPDATE ON public.group_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pending_allocations_updated_at BEFORE UPDATE ON public.pending_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_allocation_rules_updated_at BEFORE UPDATE ON public.allocation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supervisor_feedback_updated_at BEFORE UPDATE ON public.supervisor_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_phase_templates_updated_at BEFORE UPDATE ON public.phase_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS
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
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Supervisors can view other supervisors" ON public.profiles FOR SELECT USING (is_supervisor(auth.uid()) AND user_type = 'supervisor');
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- USER ROLES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- STUDENTS
CREATE POLICY "Students can view their own record" ON public.students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Students can insert their own record" ON public.students FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Students can update their own record" ON public.students FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all students" ON public.students FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Supervisors can view all students" ON public.students FOR SELECT USING (is_supervisor(auth.uid()));

-- SUPERVISORS
CREATE POLICY "Supervisors can view their own record" ON public.supervisors FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Supervisors can insert their own record" ON public.supervisors FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Supervisors can update their own record" ON public.supervisors FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Supervisors can view all supervisors" ON public.supervisors FOR SELECT USING (is_supervisor(auth.uid()));
CREATE POLICY "Students can view all supervisors" ON public.supervisors FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'student'));
CREATE POLICY "Admins can manage all supervisors" ON public.supervisors FOR ALL USING (has_role(auth.uid(), 'admin'));

-- PROJECTS
CREATE POLICY "Students can view their own projects" ON public.projects FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert their own projects" ON public.projects FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update non-finalized projects" ON public.projects FOR UPDATE USING (student_id = auth.uid() AND status NOT IN ('finalized', 'archived'));
CREATE POLICY "Supervisors can view all projects" ON public.projects FOR SELECT USING (is_supervisor(auth.uid()));
CREATE POLICY "Supervisors can update projects" ON public.projects FOR UPDATE USING (supervisor_id = auth.uid() OR (supervisor_id IS NULL AND is_supervisor(auth.uid())));
CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert projects" ON public.projects FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all projects" ON public.projects FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- PROJECT REVISIONS
CREATE POLICY "Users can view revisions" ON public.project_revisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_revisions.project_id AND (student_id = auth.uid() OR supervisor_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create revisions" ON public.project_revisions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE id = project_revisions.project_id AND student_id = auth.uid() AND status NOT IN ('finalized', 'archived'))
  OR has_role(auth.uid(), 'admin'));

-- PROJECT DOCUMENTS
CREATE POLICY "Students can manage their project docs" ON public.project_documents FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_documents.project_id AND p.student_id = auth.uid()));
CREATE POLICY "Supervisors can view assigned project docs" ON public.project_documents FOR SELECT USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_documents.project_id AND p.supervisor_id = auth.uid()));
CREATE POLICY "Admins can manage all project docs" ON public.project_documents FOR ALL USING (has_role(auth.uid(), 'admin'));

-- PROJECT PHASES
CREATE POLICY "Students can manage their phases" ON public.project_phases FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.student_id = auth.uid()));
CREATE POLICY "Supervisors can manage assigned phases" ON public.project_phases FOR ALL USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_phases.project_id AND p.supervisor_id = auth.uid()));
CREATE POLICY "Admins can manage all phases" ON public.project_phases FOR ALL USING (has_role(auth.uid(), 'admin'));

-- STUDENT GROUPS
CREATE POLICY "Students can create groups" ON public.student_groups FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Students can view their groups" ON public.student_groups FOR SELECT USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = student_groups.id AND gm.student_id = auth.uid()));
CREATE POLICY "Supervisors can view all groups" ON public.student_groups FOR SELECT USING (is_supervisor(auth.uid()));
CREATE POLICY "Supervisors can delete groups" ON public.student_groups FOR DELETE USING (is_supervisor(auth.uid()));
CREATE POLICY "Admins can manage all groups" ON public.student_groups FOR ALL USING (has_role(auth.uid(), 'admin'));

-- GROUP MEMBERS
CREATE POLICY "Students can view their memberships" ON public.group_members FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert members" ON public.group_members FOR INSERT WITH CHECK (user_owns_group(auth.uid(), group_id));
CREATE POLICY "Supervisors can view all members" ON public.group_members FOR SELECT USING (is_supervisor(auth.uid()));
CREATE POLICY "Admins can manage all members" ON public.group_members FOR ALL USING (has_role(auth.uid(), 'admin'));

-- GROUP MILESTONES
CREATE POLICY "Group creators can view milestones" ON public.group_milestones FOR SELECT USING (EXISTS (SELECT 1 FROM student_groups sg WHERE sg.id = group_milestones.group_id AND sg.created_by = auth.uid()));
CREATE POLICY "Members can view milestones" ON public.group_milestones FOR SELECT USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_milestones.group_id AND gm.student_id = auth.uid()));
CREATE POLICY "Supervisors can manage milestones" ON public.group_milestones FOR ALL USING (EXISTS (SELECT 1 FROM group_allocations ga WHERE ga.group_id = group_milestones.group_id AND ga.supervisor_id = auth.uid() AND ga.status = 'accepted'));
CREATE POLICY "Admins can manage all milestones" ON public.group_milestones FOR ALL USING (has_role(auth.uid(), 'admin'));

-- MILESTONE UPDATES
CREATE POLICY "Creators can manage updates" ON public.milestone_updates FOR ALL USING (EXISTS (SELECT 1 FROM group_milestones gm JOIN student_groups sg ON sg.id = gm.group_id WHERE gm.id = milestone_updates.milestone_id AND sg.created_by = auth.uid()));
CREATE POLICY "Members can manage updates" ON public.milestone_updates FOR ALL USING (EXISTS (SELECT 1 FROM group_milestones gm JOIN group_members gmem ON gmem.group_id = gm.group_id WHERE gm.id = milestone_updates.milestone_id AND gmem.student_id = auth.uid()));
CREATE POLICY "Supervisors can manage updates" ON public.milestone_updates FOR ALL USING (EXISTS (SELECT 1 FROM group_milestones gm JOIN group_allocations ga ON ga.group_id = gm.group_id WHERE gm.id = milestone_updates.milestone_id AND ga.supervisor_id = auth.uid() AND ga.status = 'accepted'));

-- GROUP ALLOCATIONS
CREATE POLICY "Students can view their allocations" ON public.group_allocations FOR SELECT USING (EXISTS (SELECT 1 FROM student_groups sg WHERE sg.id = group_allocations.group_id AND sg.created_by = auth.uid()));
CREATE POLICY "Students can insert allocations" ON public.group_allocations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM student_groups sg WHERE sg.id = group_allocations.group_id AND sg.created_by = auth.uid()));
CREATE POLICY "Supervisors can view their allocations" ON public.group_allocations FOR SELECT USING (supervisor_id = auth.uid());
CREATE POLICY "Supervisors can update their allocations" ON public.group_allocations FOR UPDATE USING (supervisor_id = auth.uid());
CREATE POLICY "Admins can manage all allocations" ON public.group_allocations FOR ALL USING (has_role(auth.uid(), 'admin'));

-- PENDING ALLOCATIONS
CREATE POLICY "Supervisors can view their pending" ON public.pending_allocations FOR SELECT USING (supervisor_id = auth.uid());
CREATE POLICY "Supervisors can update their pending" ON public.pending_allocations FOR UPDATE USING (supervisor_id = auth.uid());
CREATE POLICY "Admins can manage all pending" ON public.pending_allocations FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view their project pending" ON public.pending_allocations FOR SELECT USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = pending_allocations.project_id AND p.student_id = auth.uid()));

-- ALLOCATION RULES
CREATE POLICY "Admins can manage rules" ON public.allocation_rules FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Supervisors can view rules" ON public.allocation_rules FOR SELECT USING (is_supervisor(auth.uid()));

-- SUPERVISOR FEEDBACK
CREATE POLICY "Supervisors can manage feedback" ON public.supervisor_feedback FOR ALL USING (supervisor_id = auth.uid());
CREATE POLICY "Students can view feedback" ON public.supervisor_feedback FOR SELECT USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = supervisor_feedback.project_id AND p.student_id = auth.uid()));
CREATE POLICY "Admins can manage all feedback" ON public.supervisor_feedback FOR ALL USING (has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their notifications" ON public.notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- MEETINGS
CREATE POLICY "Supervisors can manage their meetings" ON public.meetings FOR ALL USING (supervisor_id = auth.uid());
CREATE POLICY "Students can view their meetings" ON public.meetings FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can manage all meetings" ON public.meetings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SCHOOLS
CREATE POLICY "Anyone can view schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Admins can manage schools" ON public.schools FOR ALL USING (has_role(auth.uid(), 'admin'));

-- DEPARTMENTS
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- PHASE TEMPLATES
CREATE POLICY "Admins can manage templates" ON public.phase_templates FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view templates" ON public.phase_templates FOR SELECT USING (true);

-- AUDIT LOG
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
