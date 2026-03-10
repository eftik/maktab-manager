
-- Schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  grades JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access schools" ON public.schools FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'owner')
  WITH CHECK (get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Admin access own school" ON public.schools FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'admin' AND id::text = get_admin_school_id(auth.uid()))
  WITH CHECK (get_admin_role(auth.uid()) = 'admin' AND id::text = get_admin_school_id(auth.uid()));

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  id_number TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  parent_name TEXT NOT NULL DEFAULT '',
  parent_phone TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'none',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access students" ON public.students FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'owner')
  WITH CHECK (get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Admin access own school students" ON public.students FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()))
  WITH CHECK (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()));

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL DEFAULT 'tuition',
  custom_fee_label TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  bill_number TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access payments" ON public.payments FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'owner')
  WITH CHECK (get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Admin access own school payments" ON public.payments FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()))
  WITH CHECK (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()));

-- Staff table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  custom_role TEXT,
  phone TEXT NOT NULL DEFAULT '',
  id_number TEXT NOT NULL DEFAULT '',
  salary NUMERIC NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL DEFAULT '',
  exit_date TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access staff" ON public.staff FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'owner')
  WITH CHECK (get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Admin access own school staff" ON public.staff FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()))
  WITH CHECK (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()));

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  person_name TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  bill_number TEXT NOT NULL DEFAULT '',
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access expenses" ON public.expenses FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'owner')
  WITH CHECK (get_admin_role(auth.uid()) = 'owner');

CREATE POLICY "Admin access own school expenses" ON public.expenses FOR ALL TO authenticated
  USING (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()))
  WITH CHECK (get_admin_role(auth.uid()) = 'admin' AND school_id::text = get_admin_school_id(auth.uid()));
