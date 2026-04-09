-- Create table for group milestones
CREATE TABLE public.group_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for milestone status updates
CREATE TABLE public.milestone_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.group_milestones(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_milestones
CREATE POLICY "Supervisors can manage milestones for their groups"
ON public.group_milestones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.group_allocations ga
    WHERE ga.group_id = group_milestones.group_id
    AND ga.supervisor_id = auth.uid()
    AND ga.status = 'accepted'
  )
);

CREATE POLICY "Students can view milestones for their groups"
ON public.group_milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_milestones.group_id
    AND gm.student_id = auth.uid()
  )
);

CREATE POLICY "Group creators can view milestones"
ON public.group_milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.student_groups sg
    WHERE sg.id = group_milestones.group_id
    AND sg.created_by = auth.uid()
  )
);

-- RLS Policies for milestone_updates
CREATE POLICY "Supervisors can manage updates for their milestones"
ON public.milestone_updates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.group_milestones gm
    JOIN public.group_allocations ga ON ga.group_id = gm.group_id
    WHERE gm.id = milestone_updates.milestone_id
    AND ga.supervisor_id = auth.uid()
    AND ga.status = 'accepted'
  )
);

CREATE POLICY "Students can view and add updates for their group milestones"
ON public.milestone_updates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.group_milestones gm
    JOIN public.group_members gmem ON gmem.group_id = gm.group_id
    WHERE gm.id = milestone_updates.milestone_id
    AND gmem.student_id = auth.uid()
  )
);

CREATE POLICY "Group creators can manage milestone updates"
ON public.milestone_updates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.group_milestones gm
    JOIN public.student_groups sg ON sg.id = gm.group_id
    WHERE gm.id = milestone_updates.milestone_id
    AND sg.created_by = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_group_milestones_updated_at
BEFORE UPDATE ON public.group_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_group_milestones_group_id ON public.group_milestones(group_id);
CREATE INDEX idx_milestone_updates_milestone_id ON public.milestone_updates(milestone_id);