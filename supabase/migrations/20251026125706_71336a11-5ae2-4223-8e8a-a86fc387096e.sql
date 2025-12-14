-- Fix RLS policies for companies to allow admin users to create companies
DROP POLICY IF EXISTS "Admins can create companies" ON companies;

-- Recreate policy with proper check
CREATE POLICY "Admins can create companies"
ON companies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND permission_type = 'admin'
  )
);

-- Also ensure admins can view all companies
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;

CREATE POLICY "Admins can view all companies"
ON companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND permission_type IN ('admin', 'manager')
  )
);

-- Ensure DELETE policy exists for admins
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;

CREATE POLICY "Admins can delete companies"
ON companies
FOR DELETE
USING (is_admin(auth.uid()));