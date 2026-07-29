-- Mark every existing contract as MSA.
--
-- WARNING: this OVERWRITES the current `category` value on every row. Unlike the
-- other scripts in this folder it is not additive and not reversible on its own,
-- so step 1 keeps a copy of what was there. Run the whole file in one go.

-- 1. Snapshot the current categories so the change can be undone.
CREATE TABLE IF NOT EXISTS public.contracts_category_backup AS
SELECT id, category, NOW() AS backed_up_at
FROM public.contracts;

-- 2. Set everything to MSA.
UPDATE public.contracts
SET category = 'MSA';

-- 3. Check: every row should now report MSA.
-- SELECT category, COUNT(*) FROM public.contracts GROUP BY category;

-- To undo:
--   UPDATE public.contracts c
--   SET category = b.category
--   FROM public.contracts_category_backup b
--   WHERE c.id = b.id;
