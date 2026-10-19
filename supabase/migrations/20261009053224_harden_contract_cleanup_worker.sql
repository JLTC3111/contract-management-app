-- Explicitly document the private queue's service-only access. The lease must
-- outlast Supabase's 400-second maximum worker lifetime to prevent overlapping
-- cleanup of one folder by a still-running worker and a retry.
BEGIN;
CREATE POLICY contract_cleanup_service_only ON private.contract_storage_cleanup
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE OR REPLACE FUNCTION public.claim_contract_storage_cleanup(p_contract_id bigint DEFAULT NULL)
RETURNS TABLE(contract_id bigint) LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  UPDATE private.contract_storage_cleanup j SET lease_until = now() + interval '10 minutes', attempts = attempts + 1
  WHERE j.contract_id IN (SELECT q.contract_id FROM private.contract_storage_cleanup q
    WHERE (p_contract_id IS NULL OR q.contract_id = p_contract_id) AND (q.lease_until IS NULL OR q.lease_until < now())
    ORDER BY q.queued_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING j.contract_id;
$$;
COMMIT;
