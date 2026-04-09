-- Add unique constraint to prevent duplicate registration numbers in the same group
CREATE UNIQUE INDEX idx_group_members_unique_reg_number 
ON public.group_members (group_id, LOWER(reg_number));