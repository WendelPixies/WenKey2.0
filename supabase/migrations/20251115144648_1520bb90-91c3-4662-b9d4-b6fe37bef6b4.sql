-- Remove dual role system - consolidate to user_roles table only
-- All application code now reads from and writes to user_roles table

-- Drop all sync triggers first
DROP TRIGGER IF EXISTS sync_permission_to_roles_trigger ON public.profiles;
DROP TRIGGER IF EXISTS sync_profiles_permission_roles ON public.profiles;

-- Drop the sync function
DROP FUNCTION IF EXISTS public.sync_permission_to_roles() CASCADE;

-- Remove permission_type column from profiles table
-- Data is already migrated to user_roles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS permission_type;