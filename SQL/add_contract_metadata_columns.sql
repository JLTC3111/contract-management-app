-- Add created_at (+ optional metadata columns) to contracts
-- Safe to re-run: uses IF NOT EXISTS / nullable columns

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_name TEXT;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_email TEXT;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_value NUMERIC;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill created_at from updated_at when available
UPDATE public.contracts
SET created_at = COALESCE(created_at, updated_at, NOW())
WHERE created_at IS NULL;

ALTER TABLE public.contracts
  ALTER COLUMN created_at SET DEFAULT NOW();

COMMENT ON COLUMN public.contracts.created_at IS 'Contract creation timestamp';
