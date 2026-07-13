-- Supabase SQL to support contract documents, certificates, and payment links
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  contract_number TEXT,
  contract_date DATE,
  client_name TEXT,
  client_company_name TEXT,
  client_address TEXT,
  client_city TEXT,
  client_state TEXT,
  client_zip TEXT,
  client_email TEXT,
  client_phone TEXT,
  total_premium NUMERIC DEFAULT 0,
  down_payment NUMERIC DEFAULT 0,
  monthly_payment NUMERIC DEFAULT 0,
  number_of_payments INTEGER DEFAULT 0,
  first_due_date DATE,
  terms TEXT,
  created_by UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  insurance_type TEXT,
  status TEXT DEFAULT 'pending',
  policy_status TEXT DEFAULT 'active',
  expiration_date DATE,
  signed_document_url TEXT,
  certificate_url TEXT,
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  sequence INTEGER DEFAULT 0,
  label TEXT,
  amount NUMERIC DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  checkout_id TEXT,
  checkout_url TEXT
);

CREATE TABLE IF NOT EXISTS public.square_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE CASCADE,
  square_checkout_id TEXT,
  square_payment_id TEXT,
  receipt_url TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'checkout_created'
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contracts' AND column_name='total_premium') THEN
    ALTER TABLE public.contracts
      ALTER COLUMN total_premium TYPE NUMERIC USING COALESCE(total_premium,0)::NUMERIC,
      ALTER COLUMN down_payment TYPE NUMERIC USING COALESCE(down_payment,0)::NUMERIC,
      ALTER COLUMN monthly_payment TYPE NUMERIC USING COALESCE(monthly_payment,0)::NUMERIC;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payment_schedules' AND column_name='amount') THEN
    ALTER TABLE public.payment_schedules
      ALTER COLUMN amount TYPE NUMERIC USING COALESCE(amount,0)::NUMERIC;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='square_payments' AND column_name='amount') THEN
    ALTER TABLE public.square_payments
      ALTER COLUMN amount TYPE NUMERIC USING COALESCE(amount,0)::NUMERIC;
  END IF;
END $$;

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.payment_schedules ADD COLUMN IF NOT EXISTS checkout_id TEXT;
ALTER TABLE public.payment_schedules ADD COLUMN IF NOT EXISTS checkout_url TEXT;

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON public.payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_square_payments_schedule_id ON public.square_payments(schedule_id);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.square_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='admins') THEN
    DROP POLICY IF EXISTS contracts_select_own ON public.contracts;
    DROP POLICY IF EXISTS contracts_manage_own ON public.contracts;
    CREATE POLICY contracts_select_own
      ON public.contracts FOR SELECT
      USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

    CREATE POLICY contracts_manage_own
      ON public.contracts FOR INSERT
      WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS payment_schedules_select_own ON public.payment_schedules;
    DROP POLICY IF EXISTS payment_schedules_manage_own ON public.payment_schedules;
    CREATE POLICY payment_schedules_select_own
      ON public.payment_schedules FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))));

    CREATE POLICY payment_schedules_manage_own
      ON public.payment_schedules FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))));

    DROP POLICY IF EXISTS square_payments_select_own ON public.square_payments;
    DROP POLICY IF EXISTS square_payments_manage_own ON public.square_payments;
    CREATE POLICY square_payments_select_own
      ON public.square_payments FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.payment_schedules ps JOIN public.contracts c ON c.id = ps.contract_id WHERE ps.id = square_payments.schedule_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))));

    CREATE POLICY square_payments_manage_own
      ON public.square_payments FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.payment_schedules ps JOIN public.contracts c ON c.id = ps.contract_id WHERE ps.id = square_payments.schedule_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))));
  END IF;
END $$;
