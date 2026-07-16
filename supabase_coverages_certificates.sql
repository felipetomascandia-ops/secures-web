-- Create coverages and certificates tables
-- Run this in Supabase SQL Editor

-- Coverages table to store coverage details (one per insurance type)
CREATE TABLE IF NOT EXISTS public.coverages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  insurance_type TEXT NOT NULL, -- e.g. 'general-liability', 'workers-comp', 'commercial-auto', 'commercial-property'
  policy_number TEXT,
  effective_date DATE,
  expiration_date DATE,
  
  -- General Liability / Common fields
  each_occurrence NUMERIC,
  damage_to_rented_premises NUMERIC,
  med_exp NUMERIC,
  personal_adv_injury NUMERIC,
  products_completed_ops_agg NUMERIC,
  combined_single_limit NUMERIC,
  bodily_injury_per_person NUMERIC,
  bodily_injury_per_accident NUMERIC,
  property_damage_per_accident NUMERIC,
  el_each_accident NUMERIC,
  el_disease_ea_employee NUMERIC,
  el_disease_policy_limit NUMERIC,
  general_aggregate NUMERIC,
  deductible NUMERIC,
  insured_name TEXT,
  
  -- Commercial Auto
  auto_any_auto TEXT,
  auto_owned_auto TEXT,
  auto_hired_autos_only TEXT,
  auto_non_owned_autos_only TEXT,
  auto_scheduled_autos TEXT,
  
  -- Commercial Property
  property_building_limit NUMERIC,
  property_personal_property_limit NUMERIC,
  
  -- Certificate Holder
  certificate_holder_name TEXT,
  certificate_holder_address TEXT,

  -- Personal Insurance fields (added for self-service contracts)
  coverage_details TEXT,
  coverage_limit NUMERIC
);

-- Add columns if table already exists
ALTER TABLE public.coverages ADD COLUMN IF NOT EXISTS coverage_details TEXT;
ALTER TABLE public.coverages ADD COLUMN IF NOT EXISTS coverage_limit NUMERIC;

-- Certificates table to store generated certificates (PDFs or URLs)
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  coverage_id UUID REFERENCES public.coverages(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL, -- e.g. 'workers-comp', 'general-liability', 'commercial-auto', 'commercial-property'
  certificate_url TEXT, -- URL to download/view certificate
  certificate_html TEXT, -- HTML content if needed
  certificate_holder_name TEXT,
  certificate_holder_address TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coverages_contract_id ON public.coverages(contract_id);
CREATE INDEX IF NOT EXISTS idx_certificates_contract_id ON public.certificates(contract_id);
CREATE INDEX IF NOT EXISTS idx_certificates_coverage_id ON public.certificates(coverage_id);

-- Enable Row Level Security
ALTER TABLE public.coverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Add signature fields to contracts table (if not already present)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature_date TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS agent_signature TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS agent_signature_date TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE;

-- Add unpaid_balance, finance_charge, amount_financed fields
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS unpaid_balance NUMERIC;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS finance_charge NUMERIC;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS amount_financed NUMERIC;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS finance_charge_percent NUMERIC;

-- RLS Policies for coverages and certificates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='admins') THEN
    -- Coverages policies
    DROP POLICY IF EXISTS coverages_select_own ON public.coverages;
    DROP POLICY IF EXISTS coverages_manage_own ON public.coverages;
    CREATE POLICY coverages_select_own
      ON public.coverages FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = coverages.contract_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())))
      );

    CREATE POLICY coverages_manage_own
      ON public.coverages FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = coverages.contract_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())))
      );

    -- Certificates policies
    DROP POLICY IF EXISTS certificates_select_own ON public.certificates;
    DROP POLICY IF EXISTS certificates_manage_own ON public.certificates;
    CREATE POLICY certificates_select_own
      ON public.certificates FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = certificates.contract_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())))
      );

    CREATE POLICY certificates_manage_own
      ON public.certificates FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = certificates.contract_id AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())))
      );
  END IF;
END $$;