
-- System settings table to store hashed master passcode
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS but no policies - only edge functions (service role) access this
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Function to check if owner exists
CREATE OR REPLACE FUNCTION public.owner_exists()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE role = 'owner')
$$;
