-- Contract application only. Apply before deploying the matching frontend.
-- Roles follow the existing UI: members read; admin/editor write contracts;
-- admin/approver decide requests. Shared HR/newsroom tables are not changed.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.contract_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.role FROM public.users u
  WHERE (SELECT auth.uid()) IS NOT NULL AND u.id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION private.contract_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.contract_role() TO authenticated;

-- A role stored in a self-editable profile is not an authorization boundary.
-- Preserve profile editing, but only existing admins/server code assign roles.
CREATE OR REPLACE FUNCTION private.guard_contract_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF (SELECT private.contract_role()) IS DISTINCT FROM 'admin' THEN
      IF TG_OP = 'INSERT' THEN
        IF NEW.id IS DISTINCT FROM auth.uid() OR NEW.role IS DISTINCT FROM 'viewer' THEN
          RAISE EXCEPTION 'Only an administrator can assign a role' USING ERRCODE = '42501';
        END IF;
      ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Only an administrator can change a role or account ID' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_contract_user_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_contract_user_role ON public.users;
CREATE TRIGGER guard_contract_user_role BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION private.guard_contract_user_role();
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.users FROM PUBLIC, anon, authenticated;

-- Remove all older permissive policies on these app-owned tables: policies are
-- ORed, so merely adding a stricter policy would leave the old bypass intact.
DO $$
DECLARE policy_record record; table_name text; sequence_name text;
BEGIN
  FOR policy_record IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'contracts', 'contract_phases', 'phase_comments', 'phase_milestones',
      'phase_resources', 'notifications', 'contract_approval_requests')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['contracts', 'contract_phases', 'phase_comments',
    'phase_milestones', 'phase_resources', 'notifications', 'contract_approval_requests']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', table_name);
    sequence_name := pg_get_serial_sequence('public.' || table_name, 'id');
    IF sequence_name IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated', sequence_name);
      EXECUTE format('GRANT USAGE ON SEQUENCE %s TO authenticated, service_role', sequence_name);
    END IF;
  END LOOP;
END;
$$;

GRANT INSERT, UPDATE, DELETE ON public.contracts, public.contract_phases,
  public.phase_comments, public.phase_milestones, public.phase_resources TO authenticated;
GRANT INSERT ON public.contract_approval_requests TO authenticated;
GRANT UPDATE (approval_response, updated_at) ON public.contract_approval_requests TO authenticated;
GRANT UPDATE (read), DELETE ON public.notifications TO authenticated;

CREATE POLICY contract_members_read ON public.contracts FOR SELECT TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor', 'approver', 'viewer'));
CREATE POLICY contract_editors_insert ON public.contracts FOR INSERT TO authenticated
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor'));
CREATE POLICY contract_editors_update ON public.contracts FOR UPDATE TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor'))
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor'));
CREATE POLICY contract_editors_delete ON public.contracts FOR DELETE TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor'));

CREATE POLICY phase_members_read ON public.contract_phases FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE POLICY phase_editors_write ON public.contract_phases FOR ALL TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor')
  AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id))
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor')
  AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));

CREATE POLICY phase_comment_read ON public.phase_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));
CREATE POLICY phase_comment_insert ON public.phase_comments FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));
CREATE POLICY phase_comment_update ON public.phase_comments FOR UPDATE TO authenticated
USING ((user_id = (SELECT auth.uid()) OR (SELECT private.contract_role()) = 'admin')
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id))
WITH CHECK ((user_id = (SELECT auth.uid()) OR (SELECT private.contract_role()) = 'admin')
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));
CREATE POLICY phase_comment_delete ON public.phase_comments FOR DELETE TO authenticated
USING ((user_id = (SELECT auth.uid()) OR (SELECT private.contract_role()) = 'admin')
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));

CREATE POLICY phase_milestone_read ON public.phase_milestones FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));
CREATE POLICY phase_milestone_write ON public.phase_milestones FOR ALL TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor')
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id))
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor')
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));

CREATE POLICY phase_resource_read ON public.phase_resources FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));
CREATE POLICY phase_resource_insert ON public.phase_resources FOR INSERT TO authenticated
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor')
  AND uploaded_by = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));
CREATE POLICY phase_resource_update ON public.phase_resources FOR UPDATE TO authenticated
USING (((SELECT private.contract_role()) = 'admin' OR
  ((SELECT private.contract_role()) = 'editor' AND uploaded_by = (SELECT auth.uid())))
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id))
WITH CHECK (((SELECT private.contract_role()) = 'admin' OR
  ((SELECT private.contract_role()) = 'editor' AND uploaded_by = (SELECT auth.uid())))
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));
CREATE POLICY phase_resource_delete ON public.phase_resources FOR DELETE TO authenticated
USING (((SELECT private.contract_role()) = 'admin' OR
  ((SELECT private.contract_role()) = 'editor' AND uploaded_by = (SELECT auth.uid())))
  AND EXISTS (SELECT 1 FROM public.contract_phases p WHERE p.id = phase_id));

CREATE POLICY notification_owner_read ON public.notifications FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY notification_owner_update ON public.notifications FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY notification_owner_delete ON public.notifications FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY approval_members_read ON public.contract_approval_requests FOR SELECT TO authenticated
USING ((SELECT private.contract_role()) IN ('admin', 'editor', 'approver')
  AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE POLICY approval_editors_request ON public.contract_approval_requests FOR INSERT TO authenticated
WITH CHECK ((SELECT private.contract_role()) IN ('admin', 'editor')
  AND requester_id = (SELECT auth.uid()) AND status = 'pending'
  AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE POLICY approval_response_update ON public.contract_approval_requests FOR UPDATE TO authenticated
USING ((SELECT private.contract_role()) = 'admin' OR
  ((SELECT private.contract_role()) = 'approver' AND (approver_id IS NULL OR approver_id = (SELECT auth.uid()))))
WITH CHECK ((SELECT private.contract_role()) = 'admin' OR
  ((SELECT private.contract_role()) = 'approver' AND (approver_id IS NULL OR approver_id = (SELECT auth.uid()))));

-- The privileged part lives outside the exposed API schema. Lock both rows and
-- validate the stored decision so retries/concurrent clicks cannot advance twice.
CREATE OR REPLACE FUNCTION private.decide_contract_approval(p_request_id bigint, p_decision text)
RETURNS public.contract_approval_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE request_row public.contract_approval_requests; contract_row public.contracts;
  contract_key bigint; caller_role text; current_stage text; next_stage text; next_status text;
BEGIN
  caller_role := private.contract_role();
  IF auth.uid() IS NULL OR caller_role IS NULL OR caller_role NOT IN ('admin', 'approver') THEN
    RAISE EXCEPTION 'Approval permission required' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval decision' USING ERRCODE = '22023';
  END IF;
  SELECT contract_id INTO contract_key FROM public.contract_approval_requests WHERE id = p_request_id;
  SELECT * INTO contract_row FROM public.contracts WHERE id = contract_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO request_row FROM public.contract_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002'; END IF;
  IF caller_role <> 'admin' AND request_row.approver_id IS NOT NULL AND request_row.approver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Request belongs to another approver' USING ERRCODE = '42501';
  END IF;
  IF request_row.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'This request has already been decided' USING ERRCODE = '55000';
  END IF;
  IF contract_row.status IN ('expiring', 'expired') THEN
    RAISE EXCEPTION 'An expiring or expired contract cannot advance through approval' USING ERRCODE = '55000';
  END IF;
  current_stage := COALESCE(contract_row.stage, CASE contract_row.status
    WHEN 'draft' THEN 'draft' WHEN 'pending' THEN 'in_review' WHEN 'rejected' THEN 'in_review'
    WHEN 'in_progress' THEN 'negotiation' WHEN 'approved' THEN 'awaiting_signature'
    WHEN 'completed' THEN 'executed' END);
  IF p_decision = 'approved' THEN
    next_stage := CASE current_stage WHEN 'draft' THEN 'negotiation' WHEN 'in_review' THEN 'negotiation'
      WHEN 'negotiation' THEN 'awaiting_signature' WHEN 'awaiting_signature' THEN 'executed' END;
    IF next_stage IS NULL THEN RAISE EXCEPTION 'Contract cannot advance' USING ERRCODE = '55000'; END IF;
    next_status := CASE next_stage WHEN 'negotiation' THEN 'in_progress'
      WHEN 'awaiting_signature' THEN 'approved' WHEN 'executed' THEN 'completed' END;
    UPDATE public.contracts SET stage = next_stage, status = next_status, updated_at = now() WHERE id = contract_key;
  ELSE
    UPDATE public.contracts SET status = 'rejected', updated_at = now() WHERE id = contract_key;
  END IF;
  UPDATE public.contract_approval_requests SET status = p_decision, updated_at = now()
    WHERE id = p_request_id RETURNING * INTO request_row;
  RETURN request_row;
END;
$$;
CREATE OR REPLACE FUNCTION public.decide_contract_approval(p_request_id bigint, p_decision text)
RETURNS public.contract_approval_requests LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT private.decide_contract_approval(p_request_id, p_decision);
$$;
REVOKE ALL ON FUNCTION private.decide_contract_approval(bigint, text), public.decide_contract_approval(bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.decide_contract_approval(bigint, text), public.decide_contract_approval(bigint, text)
  TO authenticated;

-- The next phase starts inside the same transaction as current completion.
-- The existing phase-status trigger must also resolve its public tables when
-- called from a function with an empty search path.
ALTER FUNCTION public.update_contract_status_from_phases() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.calculate_phase_duration() SET search_path = '';
CREATE OR REPLACE FUNCTION private.advance_completed_contract_phase()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.contract_phases SET status = 'active', start_date = now(), updated_at = now()
    WHERE contract_id = NEW.contract_id AND phase_number = NEW.phase_number + 1 AND status = 'pending';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.advance_completed_contract_phase() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS advance_completed_contract_phase ON public.contract_phases;
CREATE TRIGGER advance_completed_contract_phase AFTER UPDATE OF status ON public.contract_phases
FOR EACH ROW WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION private.advance_completed_contract_phase();

ALTER FUNCTION public.get_contract_phase_analytics(integer) SECURITY INVOKER;
ALTER FUNCTION public.get_contract_phase_analytics(integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.get_contract_phase_analytics(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contract_phase_analytics(integer) TO authenticated;

-- Expiry covers every status emitted by the stage model. Notifications are
-- generated only from rows changed by this invocation, avoiding repeat sends.
CREATE OR REPLACE FUNCTION public.update_contract_expirations()
RETURNS TABLE(updated_count integer, expired_count integer, expiring_count integer, notifications_sent integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  WITH changed AS (
    UPDATE public.contracts c SET status = CASE WHEN expiry_date < CURRENT_DATE THEN 'expired' ELSE 'expiring' END,
      updated_at = now()
    WHERE (expiry_date < CURRENT_DATE AND status IN ('draft', 'pending', 'approved', 'rejected', 'in_progress', 'completed', 'expiring'))
      OR (expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + CASE status WHEN 'draft' THEN 21 WHEN 'pending' THEN 14 ELSE 7 END
        AND status IN ('draft', 'pending', 'approved', 'rejected', 'in_progress', 'completed'))
    RETURNING c.id, c.title, c.author, c.status, c.expiry_date
  ), sent AS (
    INSERT INTO public.notifications(user_id, title, message, type, contract_id)
    SELECT u.id, CASE WHEN c.status = 'expired' THEN 'Contract Expired' ELSE 'Contract Expiring Soon' END,
      'Your contract "' || c.title || '" ' || CASE WHEN c.status = 'expired' THEN 'expired on ' ELSE 'expires on ' END || c.expiry_date || '.',
      CASE WHEN c.status = 'expired' THEN 'error' ELSE 'warning' END, c.id
    FROM changed c JOIN public.users u ON u.email = c.author RETURNING id
  )
  SELECT count(*)::integer, count(*) FILTER (WHERE status = 'expired')::integer,
    count(*) FILTER (WHERE status = 'expiring')::integer, (SELECT count(*)::integer FROM sent) FROM changed;
END;
$$;
REVOKE ALL ON FUNCTION public.update_contract_expirations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_contract_expirations() TO service_role;

COMMIT;
