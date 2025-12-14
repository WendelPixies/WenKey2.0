-- Add company_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Update existing profiles with their company from company_members
UPDATE public.profiles p
SET company_id = (
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = p.id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.company_members cm WHERE cm.user_id = p.id
);

-- Create index for better query performance
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);