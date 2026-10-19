-- Require access to the parent contract. Run the contract permission migrations
-- first; do not restore the older auth.uid()-only discussion policies.
BEGIN;
ALTER TABLE public.contract_comments ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contract_comments'
  LOOP EXECUTE format('DROP POLICY %I ON public.contract_comments', item.policyname); END LOOP;
END $$;
REVOKE ALL ON public.contract_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.contract_comments TO authenticated;
GRANT USAGE ON SEQUENCE public.contract_comments_id_seq TO authenticated;
CREATE POLICY contract_comment_member_read ON public.contract_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE POLICY contract_comment_member_insert ON public.contract_comments FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE POLICY contract_comment_author_delete ON public.contract_comments FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
COMMIT;
