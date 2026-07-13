-- Non-destructive Supabase fix proposal for customer data visibility
-- Review and apply manually in Supabase SQL editor if needed.

-- 1) Ensure the contracts table can be related to auth users when present.
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Make sure the common insurance status columns exist.
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS policy_status TEXT DEFAULT 'active';

-- 3) Add the fields needed by the admin customers page directly to user_profiles.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- 4) Backfill the new columns from auth.users for existing records.
UPDATE public.user_profiles AS p
SET
  full_name = COALESCE(p.full_name, concat_ws(' ', p.first_name, p.last_name)),
  email = COALESCE(p.email, au.email)
FROM auth.users AS au
WHERE p.user_id = au.id
  AND (p.full_name IS NULL OR p.email IS NULL);

-- 5) Helpful indexes for admin customer lookups.
CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_policy_status_idx ON public.contracts(policy_status);

-- 6) Optional: add a trigger so future user profile writes keep full_name/email aligned.
-- This is intentionally non-destructive and can be enabled later if desired.
