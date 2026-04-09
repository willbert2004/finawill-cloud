-- Fix the security definer view issue by setting it to SECURITY INVOKER
ALTER VIEW public.supervisor_directory SET (security_invoker = on);
