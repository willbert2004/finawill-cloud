CREATE OR REPLACE FUNCTION public.notify_meeting_recipients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  group_name text;
  formatted_when text;
  link_path text := '/dashboard';
  meeting_details text;
BEGIN
  formatted_when := to_char(NEW.meeting_date, 'Mon DD, YYYY')
    || COALESCE(' at ' || to_char(NEW.meeting_time, 'HH24:MI'), '');

  IF NEW.group_id IS NOT NULL THEN
    SELECT name INTO group_name FROM public.student_groups WHERE id = NEW.group_id;

    meeting_details := 'Meeting "' || NEW.title || '" scheduled for ' || COALESCE(group_name, 'your group')
      || ' on ' || formatted_when
      || COALESCE('. Details: ' || NEW.description, '')
      || COALESCE('. Join: ' || NEW.meeting_link, '');

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT sg.created_by, 'New meeting: ' || NEW.title, meeting_details, 'info', link_path
    FROM public.student_groups sg
    WHERE sg.id = NEW.group_id AND sg.created_by IS NOT NULL;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT gm.student_id, 'New meeting: ' || NEW.title, meeting_details, 'info', link_path
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id AND gm.student_id IS NOT NULL;

  ELSIF NEW.student_id IS NOT NULL THEN
    meeting_details := 'Meeting "' || NEW.title || '" scheduled with you on ' || formatted_when
      || COALESCE('. Details: ' || NEW.description, '')
      || COALESCE('. Join: ' || NEW.meeting_link, '');

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.student_id, 'New meeting: ' || NEW.title, meeting_details, 'info', link_path);
  END IF;

  RETURN NEW;
END;
$$;