
-- Create meetings table
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL,
  group_id uuid REFERENCES public.student_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_link text NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Supervisors can manage their own meetings
CREATE POLICY "Supervisors can manage their meetings"
ON public.meetings FOR ALL
USING (supervisor_id = auth.uid())
WITH CHECK (supervisor_id = auth.uid());

-- Students can view meetings for their groups
CREATE POLICY "Students can view their group meetings"
ON public.meetings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = meetings.group_id
    AND gm.student_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.student_groups sg
    WHERE sg.id = meetings.group_id
    AND sg.created_by = auth.uid()
  )
);

-- Admins can view all meetings
CREATE POLICY "Admins can view all meetings"
ON public.meetings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Trigger to notify group members when a meeting is scheduled
CREATE OR REPLACE FUNCTION public.notify_group_on_meeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member RECORD;
  group_creator UUID;
  supervisor_name TEXT;
  meeting_time TEXT;
BEGIN
  SELECT full_name INTO supervisor_name FROM public.profiles WHERE user_id = NEW.supervisor_id;
  meeting_time := to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'DD Mon YYYY at HH24:MI') || ' UTC';

  -- Notify group creator
  SELECT created_by INTO group_creator FROM public.student_groups WHERE id = NEW.group_id;
  IF group_creator IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      group_creator,
      'Meeting Scheduled',
      COALESCE(supervisor_name, 'Your supervisor') || ' scheduled a meeting: "' || NEW.title || '" on ' || meeting_time,
      'meeting',
      '/student-groups'
    );
  END IF;

  -- Notify group members
  FOR member IN SELECT student_id FROM public.group_members WHERE group_id = NEW.group_id AND student_id IS NOT NULL AND student_id != group_creator
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      member.student_id,
      'Meeting Scheduled',
      COALESCE(supervisor_name, 'Your supervisor') || ' scheduled a meeting: "' || NEW.title || '" on ' || meeting_time,
      'meeting',
      '/student-groups'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_meeting_created
AFTER INSERT ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_on_meeting();

-- Enable realtime for meetings
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
