-- Este script agrega todas las columnas que faltan a la tabla contracts
-- Ejecutarlo en el Editor SQL de Supabase

-- Agregar columnas de cliente
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_city TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_state TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_zip TEXT;

-- Agregar columnas de seguro
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS insurance_type TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS policy_status TEXT DEFAULT 'active';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Agregar columnas de firmas
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signature_date TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS agent_signature TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS agent_signature_date TIMESTAMPTZ;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_policy_status_idx ON public.contracts(policy_status);

-- Agregar tabla para vehículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  year TEXT,
  make TEXT,
  model TEXT,
  vin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicles_contract_id_idx ON public.vehicles(contract_id);
