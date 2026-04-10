-- Allow all authenticated users to read profiles (needed for displaying student/supervisor names)
-- Drop existing restrictive policies first to avoid conflicts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view all profiles' AND tablename = 'profiles') THEN
    DROP POLICY "Authenticated users can view all profiles" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
