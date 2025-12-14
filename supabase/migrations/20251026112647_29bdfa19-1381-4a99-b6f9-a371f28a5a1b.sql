-- Create enum for user permissions
CREATE TYPE user_permission AS ENUM ('user', 'manager', 'admin');

-- Create enum for metric types in key results
CREATE TYPE metric_type AS ENUM ('percentage', 'quantity', 'currency', 'boolean');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT,
  sector TEXT,
  bio TEXT,
  permission_type user_permission DEFAULT 'user' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  responsible TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sectors TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create company_members table (many-to-many relationship)
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(company_id, user_id)
);

-- Create quarters table
CREATE TABLE public.quarters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(company_id, name)
);

-- Create quarter_checkins table
CREATE TABLE public.quarter_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID REFERENCES public.quarters(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(quarter_id, checkin_date)
);

-- Create objectives table
CREATE TABLE public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quarter_id UUID REFERENCES public.quarters(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create key_results table
CREATE TABLE public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES public.objectives(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metric_type metric_type NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarter_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for companies
CREATE POLICY "Users can view companies they're members of"
  ON public.companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = companies.id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permission_type = 'admin'
    )
  );

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permission_type = 'admin'
    )
  );

-- RLS Policies for company_members
CREATE POLICY "Users can view company members of their companies"
  ON public.company_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_members.company_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage company members"
  ON public.company_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permission_type = 'admin'
    )
  );

-- RLS Policies for quarters
CREATE POLICY "Users can view quarters of their companies"
  ON public.quarters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = quarters.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers and admins can create quarters"
  ON public.quarters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permission_type IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update quarters"
  ON public.quarters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permission_type IN ('manager', 'admin')
    )
  );

-- RLS Policies for quarter_checkins
CREATE POLICY "Users can view checkins of their company quarters"
  ON public.quarter_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quarters
      JOIN public.company_members ON company_members.company_id = quarters.company_id
      WHERE quarters.id = quarter_checkins.quarter_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers and admins can manage checkins"
  ON public.quarter_checkins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.permission_type IN ('manager', 'admin')
    )
  );

-- RLS Policies for objectives
CREATE POLICY "Users can view own objectives"
  ON public.objectives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all objectives in their companies"
  ON public.objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      JOIN public.quarters ON quarters.id = objectives.quarter_id
      JOIN public.company_members ON company_members.company_id = quarters.company_id
      WHERE profiles.id = auth.uid()
      AND profiles.permission_type IN ('manager', 'admin')
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own objectives"
  ON public.objectives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own objectives"
  ON public.objectives FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for key_results
CREATE POLICY "Users can view key results of their objectives"
  ON public.key_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.objectives
      WHERE objectives.id = key_results.objective_id
      AND objectives.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all key results in their companies"
  ON public.key_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.objectives
      JOIN public.quarters ON quarters.id = objectives.quarter_id
      JOIN public.company_members ON company_members.company_id = quarters.company_id
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE objectives.id = key_results.objective_id
      AND company_members.user_id = auth.uid()
      AND profiles.permission_type IN ('manager', 'admin')
    )
  );

CREATE POLICY "Users can manage key results of their objectives"
  ON public.key_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.objectives
      WHERE objectives.id = key_results.objective_id
      AND objectives.user_id = auth.uid()
    )
  );

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, permission_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quarters_updated_at
  BEFORE UPDATE ON public.quarters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON public.objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at
  BEFORE UPDATE ON public.key_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();