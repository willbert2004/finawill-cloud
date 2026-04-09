
-- Fix overly permissive INSERT policy - restrict to triggers (security definer functions)
DROP POLICY "System can insert audit logs" ON public.audit_log;

CREATE POLICY "Authenticated users can insert own audit logs"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
