-- Recommended schema enhancement for the insurance customer flow
-- This is a non-destructive change proposal for Supabase.

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS policy_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS signed_document_url TEXT,
ADD COLUMN IF NOT EXISTS certificate_url TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_policy_status_idx ON public.contracts(policy_status);

-- Optional future constraint to keep statuses consistent
-- ALTER TABLE public.contracts
-- ADD CONSTRAINT contracts_status_check
-- CHECK (status IN ('pending','active','signed','approved','cancelled'));
