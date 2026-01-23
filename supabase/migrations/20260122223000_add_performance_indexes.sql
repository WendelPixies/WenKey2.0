-- Add indexes for performance optimization to solve slow RLS checks

-- company_members: Used in is_company_member_check which is called by almost all RLS policies
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON public.company_members(company_id);

-- checkins: Used in Quarters.tsx for filtering checkins
CREATE INDEX IF NOT EXISTS idx_checkins_quarter_id ON public.checkins(quarter_id);
CREATE INDEX IF NOT EXISTS idx_checkins_company_id ON public.checkins(company_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);

-- validation: ensure profiles has company id index (it was added in 20251101165815 but being safe)
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
