-- Add policy_number column to contracts table
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS policy_number TEXT UNIQUE;

-- Create index for policy_number
CREATE INDEX IF NOT EXISTS contracts_policy_number_idx ON public.contracts(policy_number);
