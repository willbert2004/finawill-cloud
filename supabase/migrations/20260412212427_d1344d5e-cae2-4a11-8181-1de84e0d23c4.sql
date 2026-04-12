ALTER TABLE public.departments
DROP CONSTRAINT departments_school_id_fkey,
ADD CONSTRAINT departments_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;