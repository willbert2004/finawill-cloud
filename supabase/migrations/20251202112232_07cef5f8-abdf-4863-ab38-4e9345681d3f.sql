-- Update the handle_new_user function to insert into user_roles as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, user_type, full_name, school, department)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'department'
  );

  -- Insert into user_roles (cast user_type to app_role)
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student')::app_role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;