
-- Schools table
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Everyone can read active schools/departments (needed for registration)
CREATE POLICY "Anyone can view active schools" ON public.schools FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active departments" ON public.departments FOR SELECT USING (is_active = true);

-- Super admins can manage schools
CREATE POLICY "Super admins can manage schools" ON public.schools FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage departments" ON public.departments FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed with HIT schools and departments
INSERT INTO public.schools (name) VALUES
  ('School of Information Science and Technology'),
  ('School of Industrial Sciences and Technology'),
  ('School of Engineering and Technology'),
  ('School of Business and Management Sciences'),
  ('School of Pharmaceutical Sciences and Technology'),
  ('School of Creative Arts and Design');

-- Insert departments
INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name FROM public.schools s,
  (VALUES ('Computer Science'), ('Information Technology'), ('Information Security and Assurance'), ('Software Engineering')) AS d(name)
WHERE s.name = 'School of Information Science and Technology';

INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name FROM public.schools s,
  (VALUES ('Chemical and Process Systems Engineering'), ('Food Processing Technology'), ('Polymer Technology and Engineering'), ('Biotechnology'), ('Fuels and Energy')) AS d(name)
WHERE s.name = 'School of Industrial Sciences and Technology';

INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name FROM public.schools s,
  (VALUES ('Electronic Engineering'), ('Computer and Software Engineering'), ('Industrial and Manufacturing Engineering'), ('Telecommunications Engineering')) AS d(name)
WHERE s.name = 'School of Engineering and Technology';

INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name FROM public.schools s,
  (VALUES ('Accounting and Finance'), ('Marketing'), ('Supply Chain Management'), ('Entrepreneurship and Business Management')) AS d(name)
WHERE s.name = 'School of Business and Management Sciences';

INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name FROM public.schools s,
  (VALUES ('Pharmaceutical Technology'), ('Sports Science and Coaching')) AS d(name)
WHERE s.name = 'School of Pharmaceutical Sciences and Technology';

INSERT INTO public.departments (school_id, name)
SELECT s.id, d.name FROM public.schools s,
  (VALUES ('Film and Television Production'), ('Animation and Visual Effects'), ('Music and Sound Engineering')) AS d(name)
WHERE s.name = 'School of Creative Arts and Design';

-- Updated_at trigger
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
