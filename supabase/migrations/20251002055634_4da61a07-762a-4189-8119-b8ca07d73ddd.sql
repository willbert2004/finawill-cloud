-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  student_number TEXT UNIQUE,
  department TEXT,
  year_of_study INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supervisors table
CREATE TABLE public.supervisors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  research_areas TEXT[],
  max_projects INTEGER DEFAULT 5,
  current_projects INTEGER DEFAULT 0,
  department TEXT,
  office_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
CREATE POLICY "Students can view their own record"
ON public.students FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Students can insert their own record"
ON public.students FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update their own record"
ON public.students FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all students"
ON public.students FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'admin'
));

CREATE POLICY "Admins can manage all students"
ON public.students FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'admin'
));

CREATE POLICY "Supervisors can view all students"
ON public.students FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'supervisor'
));

-- RLS Policies for supervisors
CREATE POLICY "Supervisors can view their own record"
ON public.supervisors FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Supervisors can update their own record"
ON public.supervisors FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all supervisors"
ON public.supervisors FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'admin'
));

CREATE POLICY "Admins can manage all supervisors"
ON public.supervisors FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'admin'
));

CREATE POLICY "Students can view all supervisors"
ON public.supervisors FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'student'
));

-- Triggers for updated_at
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supervisors_updated_at
BEFORE UPDATE ON public.supervisors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create student/supervisor records on profile creation
CREATE OR REPLACE FUNCTION public.handle_profile_user_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.students (user_id, department)
    VALUES (NEW.user_id, NULL)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.user_type = 'supervisor' THEN
    INSERT INTO public.supervisors (user_id, research_areas, department)
    VALUES (NEW.user_id, NEW.research_areas, NULL)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to create student/supervisor record when profile is created
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_user_type();