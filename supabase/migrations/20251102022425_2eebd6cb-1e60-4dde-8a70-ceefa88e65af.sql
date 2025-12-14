-- Allow admins to manage profiles and sync roles when permission changes

-- 1) Admins can update any profile
create policy "Admins can update any profile"
  on public.profiles
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 2) Admins can insert profiles (useful for admin-driven onboarding)
create policy "Admins can insert profiles"
  on public.profiles
  for insert
  with check (public.is_admin(auth.uid()));

-- 3) Ensure permission_type changes are synced to user_roles
-- Create trigger if it doesn't exist
create trigger sync_profiles_permission_roles
  before insert or update on public.profiles
  for each row
  execute function public.sync_permission_to_roles();