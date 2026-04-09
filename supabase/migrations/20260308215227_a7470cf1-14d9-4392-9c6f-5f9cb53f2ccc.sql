
-- Audit log table for tracking changes
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins and admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_log FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
);

-- System can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger function to log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, target_user_id, action, table_name, old_values, new_values)
  VALUES (
    COALESCE(auth.uid(), NEW.user_id),
    NEW.user_id,
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
CREATE TRIGGER profile_audit_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();

-- Trigger function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, target_user_id, action, table_name, old_values, new_values)
    VALUES (COALESCE(auth.uid(), OLD.user_id), OLD.user_id, 'DELETE', 'user_roles', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSE
    INSERT INTO public.audit_log (user_id, target_user_id, action, table_name, old_values, new_values)
    VALUES (COALESCE(auth.uid(), NEW.user_id), NEW.user_id, TG_OP, 'user_roles',
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

-- Attach trigger to user_roles table
CREATE TRIGGER role_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();
