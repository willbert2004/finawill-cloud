
-- Add objectives and rejection_reason columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS objectives TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
