UPDATE public.notifications
SET link = '/dashboard'
WHERE title LIKE 'New meeting:%' AND (link = '/my-profile' OR link IS NULL);