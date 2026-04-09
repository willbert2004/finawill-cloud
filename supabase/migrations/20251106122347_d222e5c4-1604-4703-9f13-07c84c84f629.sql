-- Fix infinite recursion by using a SECURITY DEFINER function in policy
-- 1) Create function to check if a user owns a group without triggering RLS
create or replace function public.user_owns_group(_user_id uuid, _group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.student_groups
    where id = _group_id and created_by = _user_id
  );
$$;

-- 2) Replace the previous INSERT policy to use the function (avoids cross-table recursion)
drop policy if exists "Students can insert members into their groups" on public.group_members;
create policy "Students can insert members into their groups"
on public.group_members
for insert
to authenticated
with check (
  public.user_owns_group(auth.uid(), group_members.group_id)
);