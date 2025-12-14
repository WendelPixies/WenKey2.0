-- Fix infinite recursion in company_members RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view company members of their companies" ON company_members;

-- Create a security definer function to check company membership
CREATE OR REPLACE FUNCTION public.is_company_member_check(
  _user_id uuid,
  _company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM company_members
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Recreate the policy using the function
CREATE POLICY "Users can view company members of their companies"
ON company_members
FOR SELECT
USING (is_company_member_check(auth.uid(), company_id));

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Update quarters table to add created_by
ALTER TABLE quarters
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

-- Update existing quarters to set created_by
UPDATE quarters
SET created_by = (
  SELECT cm.user_id 
  FROM company_members cm 
  WHERE cm.company_id = quarters.company_id 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Rename and restructure checkins table
ALTER TABLE quarter_checkins RENAME TO checkins;

-- Add new columns to checkins
ALTER TABLE checkins
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS key_result_id uuid REFERENCES key_results(id),
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS value numeric,
ADD COLUMN IF NOT EXISTS note text,
ADD COLUMN IF NOT EXISTS occurred_at date,
ADD COLUMN IF NOT EXISTS checkin_dates text;

-- Rename checkin_date to occurred_at for existing data
UPDATE checkins
SET occurred_at = checkin_date
WHERE occurred_at IS NULL;

-- Update company_id based on quarter
UPDATE checkins c
SET company_id = q.company_id
FROM quarters q
WHERE c.quarter_id = q.id AND c.company_id IS NULL;

-- Drop old notes column if exists (we now have note)
ALTER TABLE checkins
DROP COLUMN IF EXISTS notes;

-- Update RLS policies for checkins
DROP POLICY IF EXISTS "Users can view checkins of their company quarters" ON checkins;
DROP POLICY IF EXISTS "Managers and admins can manage checkins" ON checkins;

CREATE POLICY "Users can view checkins of their companies"
ON checkins
FOR SELECT
USING (is_company_member_check(auth.uid(), company_id));

CREATE POLICY "Users can create checkins in their companies"
ON checkins
FOR INSERT
WITH CHECK (
  is_company_member_check(auth.uid(), company_id)
  AND auth.uid() = user_id
);

CREATE POLICY "Users can update their own checkins"
ON checkins
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can manage all checkins"
ON checkins
FOR ALL
USING (is_manager_or_admin(auth.uid()));