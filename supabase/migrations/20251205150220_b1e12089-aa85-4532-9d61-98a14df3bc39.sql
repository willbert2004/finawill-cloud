-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications (via service role or triggers)
CREATE POLICY "Authenticated users can receive notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify on allocation request
CREATE OR REPLACE FUNCTION public.notify_supervisor_on_allocation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.supervisor_id,
    'New Allocation Request',
    'You have a new group allocation request pending your review.',
    'allocation',
    '/allocation'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for allocation requests
CREATE TRIGGER on_group_allocation_created
AFTER INSERT ON public.group_allocations
FOR EACH ROW
EXECUTE FUNCTION public.notify_supervisor_on_allocation();

-- Create function to notify student on allocation response
CREATE OR REPLACE FUNCTION public.notify_student_on_allocation_response()
RETURNS TRIGGER AS $$
DECLARE
  group_creator UUID;
  status_msg TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    SELECT created_by INTO group_creator FROM public.student_groups WHERE id = NEW.group_id;
    
    IF NEW.status = 'accepted' THEN
      status_msg := 'Your group allocation request has been accepted!';
    ELSE
      status_msg := 'Your group allocation request has been declined.';
    END IF;
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      group_creator,
      'Allocation ' || INITCAP(NEW.status),
      status_msg,
      'allocation',
      '/student-groups'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for allocation responses
CREATE TRIGGER on_allocation_status_changed
AFTER UPDATE ON public.group_allocations
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_on_allocation_response();

-- Create function to notify on milestone creation
CREATE OR REPLACE FUNCTION public.notify_group_on_milestone()
RETURNS TRIGGER AS $$
DECLARE
  member RECORD;
BEGIN
  FOR member IN SELECT student_id FROM public.group_members WHERE group_id = NEW.group_id AND student_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      member.student_id,
      'New Milestone Added',
      'A new milestone "' || NEW.title || '" has been added to your group.',
      'milestone',
      '/student-groups'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for milestone creation
CREATE TRIGGER on_milestone_created
AFTER INSERT ON public.group_milestones
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_on_milestone();