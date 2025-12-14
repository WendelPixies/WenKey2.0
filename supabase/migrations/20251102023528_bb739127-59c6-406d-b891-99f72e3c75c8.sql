-- Grant admins ability to view all quarters and objectives across companies

-- Quarters: allow admins to SELECT all
create policy "Admins can view all quarters"
  on public.quarters
  for select
  using (public.is_admin(auth.uid()));

-- Objectives: allow admins to SELECT all
create policy "Admins can view all objectives"
  on public.objectives
  for select
  using (public.is_admin(auth.uid()));