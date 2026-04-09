-- Create student_groups table
CREATE TABLE public.student_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, student_id)
);

-- Create group_allocations table to track supervisor assignments to groups
CREATE TABLE public.group_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score NUMERIC DEFAULT 0.00,
  match_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_groups
CREATE POLICY "Admins can manage all groups" ON public.student_groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Students can view their groups" ON public.student_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND student_id = auth.uid())
  );

CREATE POLICY "Supervisors can view all groups" ON public.student_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor')
  );

-- RLS Policies for group_members
CREATE POLICY "Admins can manage all group members" ON public.group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Students can view their group memberships" ON public.group_members
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Supervisors can view all group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'supervisor')
  );

-- RLS Policies for group_allocations
CREATE POLICY "Admins can manage all group allocations" ON public.group_allocations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Supervisors can view their group allocations" ON public.group_allocations
  FOR SELECT USING (
    supervisor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Supervisors can update their group allocations" ON public.group_allocations
  FOR UPDATE USING (supervisor_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_student_groups_updated_at
  BEFORE UPDATE ON public.student_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_allocations_updated_at
  BEFORE UPDATE ON public.group_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();