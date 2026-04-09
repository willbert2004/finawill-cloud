DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pending_allocations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_allocations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_allocations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_allocations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'student_groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'supervisors') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisors;
  END IF;
END $$;