-- Run the contract audit migration first; it also protects role assignment.
-- Reapplying this legacy helper must not restore authentication-only writes.
BEGIN;
DO $$
DECLARE p record;
BEGIN
  IF to_regprocedure('private.contract_role()') IS NULL THEN
    RAISE EXCEPTION 'Apply the audit_contract_permissions_and_transitions migration first';
  END IF;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contracts'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.contracts', p.policyname);
  END LOOP;
END;
$$;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contracts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
CREATE POLICY contract_members_read ON public.contracts FOR SELECT TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor', 'approver', 'viewer'));
CREATE POLICY contract_editors_insert ON public.contracts FOR INSERT TO authenticated
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor'));
CREATE POLICY contract_editors_update ON public.contracts FOR UPDATE TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor'))
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor'));
CREATE POLICY contract_editors_delete ON public.contracts FOR DELETE TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor'));

COMMIT;
