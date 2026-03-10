
-- Create admin role enum
CREATE TYPE public.admin_role AS ENUM ('owner', 'admin');

-- Create admins table (links auth users to schools with roles)
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'admin',
  school_id TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id UUID)
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.admins WHERE user_id = _user_id LIMIT 1
$$;

-- Security definer function to get admin's school_id
CREATE OR REPLACE FUNCTION public.get_admin_school_id(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.admins WHERE user_id = _user_id LIMIT 1
$$;

-- Owners can see all admins, admins can only see themselves
CREATE POLICY "Owners see all admins" ON public.admins
  FOR SELECT TO authenticated
  USING (
    public.get_admin_role(auth.uid()) = 'owner' 
    OR user_id = auth.uid()
  );

-- Only owners can insert new admins
CREATE POLICY "Owners can create admins" ON public.admins
  FOR INSERT TO authenticated
  WITH CHECK (public.get_admin_role(auth.uid()) = 'owner');

-- Only owners can update admins
CREATE POLICY "Owners can update admins" ON public.admins
  FOR UPDATE TO authenticated
  USING (public.get_admin_role(auth.uid()) = 'owner');

-- Only owners can delete admins
CREATE POLICY "Owners can delete admins" ON public.admins
  FOR DELETE TO authenticated
  USING (public.get_admin_role(auth.uid()) = 'owner');
