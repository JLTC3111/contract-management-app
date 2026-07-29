-- Add the 7-value `stage` column to contracts.
-- Purely additive and safe to re-run: no column is dropped, no row is deleted,
-- and the existing `status` column is left exactly as it is. Stage is backfilled
-- from status only where it is still NULL, so re-running never overwrites a
-- stage someone has since set by hand.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS stage TEXT;

-- Backfill from the legacy status vocabulary.
-- `rejected` has no stage of its own and lands in in_review; those rows keep
-- status = 'rejected', so nothing is lost.
UPDATE public.contracts
SET stage = CASE status
  WHEN 'draft'       THEN 'draft'
  WHEN 'pending'     THEN 'in_review'
  WHEN 'rejected'    THEN 'in_review'
  WHEN 'in_progress' THEN 'negotiation'
  WHEN 'approved'    THEN 'awaiting_signature'
  WHEN 'completed'   THEN 'executed'
  WHEN 'expiring'    THEN 'expiring_soon'
  WHEN 'expired'     THEN 'expired'
  ELSE 'draft'
END
WHERE stage IS NULL;

ALTER TABLE public.contracts
  ALTER COLUMN stage SET DEFAULT 'draft';

-- Reject unknown values without touching anything already stored.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contracts_stage_check'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_stage_check CHECK (stage IN (
        'draft', 'in_review', 'negotiation', 'awaiting_signature',
        'executed', 'expiring_soon', 'expired'
      )) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contracts_stage_idx ON public.contracts (stage);

COMMENT ON COLUMN public.contracts.stage IS
  'Contract lifecycle stage. Kept in sync with the legacy status column by the app.';
