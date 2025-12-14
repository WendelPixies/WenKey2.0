-- Add DELETE policies for quarters
CREATE POLICY "Managers and admins can delete quarters"
ON public.quarters
FOR DELETE
USING (is_manager_or_admin(auth.uid()));

-- Add DELETE policies for profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin(auth.uid()));

-- Add DELETE policies for objectives
CREATE POLICY "Admins and managers can delete objectives"
ON public.objectives
FOR DELETE
USING (is_manager_or_admin(auth.uid()));