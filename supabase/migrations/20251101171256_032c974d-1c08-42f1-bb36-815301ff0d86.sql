-- Drop old policy
DROP POLICY IF EXISTS "Admins can manage company members" ON public.company_members;

-- Create separate policies for better control
CREATE POLICY "Admins can view all company members"
ON public.company_members
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert company members"
ON public.company_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update company members"
ON public.company_members
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete company members"
ON public.company_members
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create trigger to sync permission_type to user_roles
CREATE OR REPLACE FUNCTION public.sync_permission_to_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete old role
  DELETE FROM public.user_roles 
  WHERE user_id = NEW.id;
  
  -- Insert new role based on permission_type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.permission_type::text::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS sync_permission_to_roles_trigger ON public.profiles;
CREATE TRIGGER sync_permission_to_roles_trigger
AFTER INSERT OR UPDATE OF permission_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_permission_to_roles();