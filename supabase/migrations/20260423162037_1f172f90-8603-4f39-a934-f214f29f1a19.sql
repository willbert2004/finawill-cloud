
CREATE OR REPLACE FUNCTION public.notify_meeting_recipients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  group_name text;
  formatted_when text;
BEGIN
  formatted_when := to_char(NEW.meeting_date, 'Mon DD, YYYY')
    || COALESCE(' at ' || to_char(NEW.meeting_time, 'HH24:MI'), '');

  IF NEW.group_id IS NOT NULL THEN
    SELECT name INTO group_name FROM public.student_groups WHERE id = NEW.group_id;

    -- Notify the group creator
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT sg.created_by,
           'New meeting: ' || NEW.title,
           'A meeting has been scheduled for ' || COALESCE(group_name, 'your group') || ' on ' || formatted_when || '.',
           'info',
           '/my-profile'
    FROM public.student_groups sg
    WHERE sg.id = NEW.group_id AND sg.created_by IS NOT NULL;

    -- Notify all group members
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT gm.student_id,
           'New meeting: ' || NEW.title,
           'A meeting has been scheduled for ' || COALESCE(group_name, 'your group') || ' on ' || formatted_when || '.',
           'info',
           '/my-profile'
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id AND gm.student_id IS NOT NULL;

  ELSIF NEW.student_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.student_id,
            'New meeting: ' || NEW.title,
            'A meeting has been scheduled with you on ' || formatted_when || '.',
            'info',
            '/my-profile');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting_recipients ON public.meetings;
CREATE TRIGGER trg_notify_meeting_recipients
AFTER INSERT ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.notify_meeting_recipients();
