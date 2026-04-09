-- Create supervisor records for all users with user_type='supervisor' who don't have a supervisors record
INSERT INTO supervisors (user_id, max_projects, current_projects)
SELECT 
  p.user_id,
  5 as max_projects,
  0 as current_projects
FROM profiles p
LEFT JOIN supervisors s ON s.user_id = p.user_id
WHERE p.user_type = 'supervisor' 
  AND s.id IS NULL
ON CONFLICT (user_id) DO NOTHING;