-- Add supervisor expertise and capacity fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS research_areas TEXT[],
ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS current_projects INTEGER DEFAULT 0;

-- Create allocation_rules table for admin configuration
CREATE TABLE IF NOT EXISTS public.allocation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_value INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pending_allocations table for supervisor suggestions
CREATE TABLE IF NOT EXISTS public.pending_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL,
  match_score NUMERIC(5,2) DEFAULT 0.00,
  match_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, supervisor_id)
);

-- Enable RLS on new tables
ALTER TABLE public.allocation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for allocation_rules
CREATE POLICY "Admins can manage allocation rules"
ON public.allocation_rules FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.user_type = 'admin'
));

CREATE POLICY "Supervisors can view allocation rules"
ON public.allocation_rules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.user_type IN ('supervisor', 'admin')
));

-- RLS Policies for pending_allocations
CREATE POLICY "Supervisors can view their pending allocations"
ON public.pending_allocations FOR SELECT
USING (supervisor_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.user_type = 'admin'
));

CREATE POLICY "Supervisors can update their pending allocations"
ON public.pending_allocations FOR UPDATE
USING (supervisor_id = auth.uid())
WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Admins can manage all pending allocations"
ON public.pending_allocations FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.user_type = 'admin'
));

-- Create trigger to update current_projects count
CREATE OR REPLACE FUNCTION public.update_supervisor_project_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles
      SET current_projects = (
        SELECT COUNT(*) FROM public.projects
        WHERE supervisor_id = NEW.supervisor_id
        AND status NOT IN ('archived', 'rejected')
      )
      WHERE user_id = NEW.supervisor_id;
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.supervisor_id IS DISTINCT FROM NEW.supervisor_id THEN
    IF OLD.supervisor_id IS NOT NULL THEN
      UPDATE public.profiles
      SET current_projects = (
        SELECT COUNT(*) FROM public.projects
        WHERE supervisor_id = OLD.supervisor_id
        AND status NOT IN ('archived', 'rejected')
      )
      WHERE user_id = OLD.supervisor_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_project_count_trigger
AFTER INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_supervisor_project_count();

-- Insert default allocation rules
INSERT INTO public.allocation_rules (rule_name, rule_value, description)
VALUES 
  ('max_projects_per_supervisor', 5, 'Maximum number of projects a supervisor can handle'),
  ('min_match_score', 60, 'Minimum match score (0-100) for automatic allocation suggestions')
ON CONFLICT DO NOTHING;