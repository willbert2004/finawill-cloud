-- Allow users to delete their own profiles
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (user_id = auth.uid());

-- Ensure supervisors table cascades deletes from profiles
ALTER TABLE public.supervisors
DROP CONSTRAINT IF EXISTS supervisors_user_id_fkey,
ADD CONSTRAINT supervisors_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;