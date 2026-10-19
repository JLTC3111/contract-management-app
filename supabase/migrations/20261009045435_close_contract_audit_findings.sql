-- Contract application only: leave the shared project's other buckets/tables alone.
BEGIN;

GRANT USAGE ON SCHEMA private TO service_role;
ALTER TABLE public.contracts ADD COLUMN revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.contracts ADD COLUMN lifecycle_status text;

CREATE FUNCTION private.contract_stage_status(p_stage text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE p_stage WHEN 'draft' THEN 'draft' WHEN 'in_review' THEN 'pending'
    WHEN 'negotiation' THEN 'in_progress' WHEN 'awaiting_signature' THEN 'approved'
    WHEN 'executed' THEN 'completed' END;
$$;
CREATE FUNCTION private.contract_status_stage(p_status text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE p_status WHEN 'draft' THEN 'draft' WHEN 'pending' THEN 'in_review'
    WHEN 'rejected' THEN 'in_review' WHEN 'in_progress' THEN 'negotiation'
    WHEN 'approved' THEN 'awaiting_signature' WHEN 'completed' THEN 'executed' END;
$$;
CREATE FUNCTION private.contract_expiry_status(p_date date, p_lifecycle text)
RETURNS text LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE WHEN p_date < CURRENT_DATE THEN 'expired'
    WHEN p_date <= CURRENT_DATE + CASE p_lifecycle
      WHEN 'draft' THEN 21 WHEN 'pending' THEN 14 WHEN 'in_progress' THEN 14 ELSE 7 END THEN 'expiring'
    ELSE p_lifecycle END;
$$;
REVOKE ALL ON FUNCTION private.contract_stage_status(text), private.contract_status_stage(text),
  private.contract_expiry_status(date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.contract_stage_status(text), private.contract_status_stage(text),
  private.contract_expiry_status(date, text) TO authenticated, service_role;

-- Keep the actual lifecycle beneath the temporary expiry override. Older rows
-- with no surviving lifecycle information start at Draft rather than advancing.
UPDATE public.contracts SET
  expiry_date = COALESCE(expiry_date, expiration_date),
  expiration_date = COALESCE(expiry_date, expiration_date),
  lifecycle_status = CASE WHEN status IN ('draft','pending','in_progress','approved','completed','rejected')
    THEN status ELSE COALESCE(private.contract_stage_status(stage), 'draft') END;
UPDATE public.contracts SET stage = CASE
  WHEN lifecycle_status = 'rejected' AND private.contract_stage_status(stage) IS NOT NULL THEN stage
  ELSE private.contract_status_stage(lifecycle_status) END;
ALTER TABLE public.contracts ALTER COLUMN lifecycle_status SET NOT NULL;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_lifecycle_status_check
  CHECK (lifecycle_status IN ('draft','pending','in_progress','approved','completed','rejected'));

CREATE FUNCTION private.sync_contract_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE base_status text; lifecycle_changed boolean := false; date_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.expiry_date := COALESCE(NEW.expiry_date, NEW.expiration_date);
    NEW.expiration_date := NEW.expiry_date;
    base_status := CASE WHEN NEW.status IN ('draft','pending','in_progress','approved','completed','rejected')
      THEN NEW.status ELSE COALESCE(private.contract_stage_status(NEW.stage), 'draft') END;
    NEW.revision := 0;
  ELSE
    base_status := OLD.lifecycle_status;
    IF NEW.expiry_date IS DISTINCT FROM OLD.expiry_date THEN
      NEW.expiration_date := NEW.expiry_date;
      date_changed := true;
    ELSIF NEW.expiration_date IS DISTINCT FROM OLD.expiration_date THEN
      NEW.expiry_date := NEW.expiration_date;
      date_changed := true;
    END IF;
    IF NEW.stage IS DISTINCT FROM OLD.stage AND private.contract_stage_status(NEW.stage) IS NOT NULL THEN
      base_status := private.contract_stage_status(NEW.stage);
      lifecycle_changed := true;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
      AND NEW.status IN ('draft','pending','in_progress','approved','completed','rejected') THEN
      base_status := NEW.status;
      lifecycle_changed := true;
    END IF;
  END IF;
  NEW.lifecycle_status := base_status;
  -- Rejection retains the stage at which the decision was made.
  IF base_status <> 'rejected' OR private.contract_stage_status(NEW.stage) IS NULL THEN
    NEW.stage := private.contract_status_stage(base_status);
  END IF;
  IF date_changed OR lifecycle_changed OR NEW.status IN ('expiring','expired') THEN
    NEW.status := private.contract_expiry_status(NEW.expiry_date, base_status);
  ELSE
    NEW.status := base_status;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.revision := OLD.revision + CASE WHEN
      (to_jsonb(NEW) - 'revision' - 'updated_at') IS DISTINCT FROM
      (to_jsonb(OLD) - 'revision' - 'updated_at') THEN 1 ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_contract_lifecycle() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_contract_lifecycle BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION private.sync_contract_lifecycle();

ALTER TABLE public.contract_approval_requests ADD COLUMN requested_revision bigint;
ALTER TABLE public.contract_approval_requests ADD COLUMN requested_stage text;
-- Some installations have a three-state CHECK, others have no status CHECK.
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.contract_approval_requests'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ~ '\mstatus\M'
  LOOP EXECUTE format('ALTER TABLE public.contract_approval_requests DROP CONSTRAINT %I', item.conname); END LOOP;
END $$;
ALTER TABLE public.contract_approval_requests ADD CONSTRAINT approval_request_status_check
  CHECK (status IN ('pending','approved','rejected','superseded'));
UPDATE public.contract_approval_requests r SET requested_revision = c.revision, requested_stage = c.stage
FROM public.contracts c WHERE c.id = r.contract_id;
-- Preserve old decisions while retiring redundant pending copies, if present.
WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY contract_id ORDER BY created_at, id) AS position
  FROM public.contract_approval_requests WHERE status = 'pending'
)
UPDATE public.contract_approval_requests SET status = 'superseded', updated_at = now()
WHERE id IN (SELECT id FROM duplicates WHERE position > 1);
CREATE UNIQUE INDEX one_pending_contract_approval ON public.contract_approval_requests(contract_id)
  WHERE status = 'pending';

CREATE FUNCTION private.retire_stale_contract_approvals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.contract_approval_requests SET status = 'superseded', updated_at = now()
  WHERE contract_id = NEW.id AND status = 'pending' AND requested_revision IS DISTINCT FROM NEW.revision;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.retire_stale_contract_approvals() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER retire_stale_contract_approvals AFTER UPDATE ON public.contracts
FOR EACH ROW WHEN (OLD.revision IS DISTINCT FROM NEW.revision)
EXECUTE FUNCTION private.retire_stale_contract_approvals();

-- Covers direct legacy INSERTs too. Locking the parent serializes submissions;
-- the initial transition and the request either both commit or both roll back.
CREATE FUNCTION private.prepare_contract_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE contract_row public.contracts;
BEGIN
  SELECT * INTO contract_row FROM public.contracts WHERE id = NEW.contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0002'; END IF;
  IF contract_row.stage NOT IN ('draft','in_review','negotiation','awaiting_signature')
    OR private.contract_expiry_status(contract_row.expiry_date, contract_row.lifecycle_status) IN ('expiring','expired') THEN
    RAISE EXCEPTION 'Contract cannot be submitted for approval' USING ERRCODE = '55000';
  END IF;
  IF contract_row.stage = 'draft' OR contract_row.lifecycle_status = 'rejected' THEN
    UPDATE public.contracts SET stage = CASE WHEN stage = 'draft' THEN 'in_review' ELSE stage END,
      status = CASE WHEN stage = 'draft' THEN 'pending' ELSE private.contract_stage_status(stage) END,
      updated_at = now() WHERE id = NEW.contract_id RETURNING * INTO contract_row;
  END IF;
  NEW.requested_revision := contract_row.revision;
  NEW.requested_stage := contract_row.stage;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.prepare_contract_approval() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prepare_contract_approval BEFORE INSERT ON public.contract_approval_requests
FOR EACH ROW EXECUTE FUNCTION private.prepare_contract_approval();

CREATE FUNCTION public.request_contract_approval(p_contract_id bigint, p_message text,
  p_expected_revision bigint DEFAULT NULL)
RETURNS public.contract_approval_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE contract_row public.contracts; request_row public.contract_approval_requests; caller_email text;
BEGIN
  IF auth.uid() IS NULL OR (SELECT private.contract_role()) IS NULL
    OR (SELECT private.contract_role()) NOT IN ('admin','editor') THEN
    RAISE EXCEPTION 'Contract editing permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO contract_row FROM public.contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0002'; END IF;
  -- An identical retry returns the existing request without moving the stage.
  SELECT * INTO request_row FROM public.contract_approval_requests
    WHERE contract_id = p_contract_id AND status = 'pending';
  IF FOUND THEN RETURN request_row; END IF;
  IF p_expected_revision IS NOT NULL AND p_expected_revision <> contract_row.revision THEN
    RAISE EXCEPTION 'Contract changed. Reload it before requesting approval.' USING ERRCODE = '40001';
  END IF;
  SELECT email INTO caller_email FROM public.users WHERE id = auth.uid();
  INSERT INTO public.contract_approval_requests(contract_id, requester_id, requester_email, message, status)
    VALUES (p_contract_id, auth.uid(), COALESCE(caller_email, ''), COALESCE(p_message, ''), 'pending')
    RETURNING * INTO request_row;
  RETURN request_row;
END;
$$;
REVOKE ALL ON FUNCTION public.request_contract_approval(bigint, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_contract_approval(bigint, text, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION private.decide_contract_approval(p_request_id bigint, p_decision text)
RETURNS public.contract_approval_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE request_row public.contract_approval_requests; contract_row public.contracts;
  contract_key bigint; caller_role text; next_stage text;
BEGIN
  caller_role := private.contract_role();
  IF auth.uid() IS NULL OR caller_role IS NULL OR caller_role NOT IN ('admin','approver') THEN
    RAISE EXCEPTION 'Approval permission required' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid approval decision' USING ERRCODE = '22023';
  END IF;
  SELECT contract_id INTO contract_key FROM public.contract_approval_requests WHERE id = p_request_id;
  SELECT * INTO contract_row FROM public.contracts WHERE id = contract_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO request_row FROM public.contract_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF caller_role <> 'admin' AND request_row.approver_id IS NOT NULL AND request_row.approver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Request belongs to another approver' USING ERRCODE = '42501';
  END IF;
  IF request_row.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'This request has already been decided or superseded' USING ERRCODE = '55000';
  END IF;
  IF request_row.requested_revision IS DISTINCT FROM contract_row.revision
    OR request_row.requested_stage IS DISTINCT FROM contract_row.stage THEN
    RAISE EXCEPTION 'Contract changed. Request a new approval.' USING ERRCODE = '55000';
  END IF;
  IF private.contract_expiry_status(contract_row.expiry_date, contract_row.lifecycle_status) IN ('expiring','expired') THEN
    RAISE EXCEPTION 'An expiring or expired contract cannot advance through approval' USING ERRCODE = '55000';
  END IF;
  IF p_decision = 'approved' THEN
    next_stage := CASE contract_row.stage WHEN 'in_review' THEN 'negotiation'
      WHEN 'negotiation' THEN 'awaiting_signature' WHEN 'awaiting_signature' THEN 'executed' END;
    IF next_stage IS NULL THEN RAISE EXCEPTION 'Contract cannot advance' USING ERRCODE = '55000'; END IF;
  END IF;
  -- Mark this request first so the contract revision trigger only retires other
  -- stale requests. A failure in either write still rolls back the transaction.
  UPDATE public.contract_approval_requests SET status = p_decision, updated_at = now()
    WHERE id = p_request_id RETURNING * INTO request_row;
  IF p_decision = 'approved' THEN
    UPDATE public.contracts SET stage = next_stage, status = private.contract_stage_status(next_stage), updated_at = now()
      WHERE id = contract_key;
  ELSE
    UPDATE public.contracts SET status = 'rejected', updated_at = now() WHERE id = contract_key;
  END IF;
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contract_status_from_phases()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE total integer; completed integer; base_status text;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'completed') INTO total, completed
    FROM public.contract_phases WHERE contract_id = NEW.contract_id;
  SELECT lifecycle_status INTO base_status FROM public.contracts WHERE id = NEW.contract_id FOR UPDATE;
  IF total > 0 AND completed = total THEN
    UPDATE public.contracts SET stage = 'executed', status = 'completed', updated_at = now()
      WHERE id = NEW.contract_id AND lifecycle_status <> 'completed';
  ELSIF completed > 0 AND base_status IN ('approved','pending') THEN
    UPDATE public.contracts SET stage = 'negotiation', status = 'in_progress', updated_at = now()
      WHERE id = NEW.contract_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.update_contract_status_from_phases() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_contract_expirations()
RETURNS TABLE(updated_count integer, expired_count integer, expiring_count integer, notifications_sent integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  WITH changed AS (
    UPDATE public.contracts c SET status = private.contract_expiry_status(COALESCE(c.expiry_date, c.expiration_date), c.lifecycle_status),
      updated_at = now()
    WHERE c.status IS DISTINCT FROM private.contract_expiry_status(COALESCE(c.expiry_date, c.expiration_date), c.lifecycle_status)
    RETURNING c.id, c.title, c.author, c.status, c.expiry_date
  ), sent AS (
    INSERT INTO public.notifications(user_id, title, message, type, contract_id)
    SELECT u.id, CASE WHEN c.status = 'expired' THEN 'Contract Expired' ELSE 'Contract Expiring Soon' END,
      'Your contract "' || c.title || '" ' || CASE WHEN c.status = 'expired' THEN 'expired on ' ELSE 'expires on ' END || c.expiry_date || '.',
      CASE WHEN c.status = 'expired' THEN 'error' ELSE 'warning' END, c.id
    FROM changed c JOIN public.users u ON u.email = c.author
    WHERE c.status IN ('expiring','expired') RETURNING id
  )
  SELECT count(*)::integer, count(*) FILTER (WHERE status = 'expired')::integer,
    count(*) FILTER (WHERE status = 'expiring')::integer, (SELECT count(*)::integer FROM sent) FROM changed;
END;
$$;

-- Comments require the same access to the parent record as the contract UI.
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contract_comments'
  LOOP EXECUTE format('DROP POLICY %I ON public.contract_comments', item.policyname); END LOOP;
END $$;
ALTER TABLE public.contract_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.contract_comments TO authenticated;
DO $$ DECLARE sequence_name text; BEGIN
  sequence_name := pg_get_serial_sequence('public.contract_comments','id');
  IF sequence_name IS NOT NULL THEN EXECUTE format('GRANT USAGE ON SEQUENCE %s TO authenticated, service_role', sequence_name); END IF;
END $$;
CREATE POLICY contract_comment_member_read ON public.contract_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE POLICY contract_comment_member_insert ON public.contract_comments FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE POLICY contract_comment_author_delete ON public.contract_comments FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id));
CREATE INDEX IF NOT EXISTS contract_comments_contract_id_idx ON public.contract_comments(contract_id);

-- Restrictive policies are ANDed with every legacy permissive policy, including
-- policies shared with other apps. Non-contract buckets retain their behavior.
CREATE FUNCTION private.contract_storage_access(p_name text, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT (SELECT private.contract_role()) = ANY(CASE WHEN p_write THEN ARRAY['admin','editor']
    ELSE ARRAY['admin','editor','approver','viewer'] END)
    AND p_name ~ '^uploads/[0-9]+/.+'
    AND p_name !~ '(^|/)[.]{1,2}(/|$)'
    AND (NOT p_write OR p_name ~* '/([^/]+\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|txt|csv)|[.]keep)$')
    AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id::text = split_part(p_name, '/', 2));
$$;
REVOKE ALL ON FUNCTION private.contract_storage_access(text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.contract_storage_access(text, boolean) TO authenticated;
CREATE POLICY contract_storage_read_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (bucket_id <> 'contracts' OR private.contract_storage_access(name, false));
CREATE POLICY contract_storage_insert_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (bucket_id <> 'contracts' OR private.contract_storage_access(name, true));
CREATE POLICY contract_storage_update_boundary ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (bucket_id <> 'contracts' OR private.contract_storage_access(name, true))
WITH CHECK (bucket_id <> 'contracts' OR private.contract_storage_access(name, true));
CREATE POLICY contract_storage_delete_boundary ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'contracts' OR private.contract_storage_access(name, true));
CREATE POLICY contract_storage_anonymous_boundary ON storage.objects AS RESTRICTIVE FOR ALL TO anon
USING (bucket_id <> 'contracts') WITH CHECK (bucket_id <> 'contracts');
CREATE POLICY contract_storage_member_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contracts' AND private.contract_storage_access(name, false));
CREATE POLICY contract_storage_editor_write ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'contracts' AND private.contract_storage_access(name, true))
WITH CHECK (bucket_id = 'contracts' AND private.contract_storage_access(name, true));
UPDATE storage.buckets SET public = false, file_size_limit = 52428800, allowed_mime_types = ARRAY[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png','image/jpeg','image/gif','image/webp','text/plain','text/csv','application/octet-stream'
] WHERE id = 'contracts';

-- A durable outbox commits with deletion. Storage deletion runs through the
-- Storage API, never DELETE FROM storage.objects, and failed jobs remain queued.
CREATE TABLE private.contract_storage_cleanup (
  contract_id bigint PRIMARY KEY, queued_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz, attempts integer NOT NULL DEFAULT 0, last_error text
);
ALTER TABLE private.contract_storage_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.contract_storage_cleanup FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.contract_storage_cleanup TO service_role;
CREATE FUNCTION private.queue_contract_storage_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO private.contract_storage_cleanup(contract_id) VALUES (OLD.id) ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.queue_contract_storage_cleanup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER queue_contract_storage_cleanup AFTER DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION private.queue_contract_storage_cleanup();
CREATE FUNCTION private.guard_contract_storage_reuse()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.contract_storage_cleanup WHERE contract_id = NEW.id) THEN
    RAISE EXCEPTION 'Document cleanup is pending for this contract ID' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_contract_storage_reuse() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_contract_storage_reuse BEFORE INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION private.guard_contract_storage_reuse();
CREATE FUNCTION public.claim_contract_storage_cleanup(p_contract_id bigint DEFAULT NULL)
RETURNS TABLE(contract_id bigint) LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  UPDATE private.contract_storage_cleanup j SET lease_until = now() + interval '5 minutes', attempts = attempts + 1
  WHERE j.contract_id IN (SELECT q.contract_id FROM private.contract_storage_cleanup q
    WHERE (p_contract_id IS NULL OR q.contract_id = p_contract_id) AND (q.lease_until IS NULL OR q.lease_until < now())
    ORDER BY q.queued_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING j.contract_id;
$$;
CREATE FUNCTION public.finish_contract_storage_cleanup(p_contract_id bigint, p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF p_error IS NULL THEN DELETE FROM private.contract_storage_cleanup WHERE contract_id = p_contract_id;
  ELSE UPDATE private.contract_storage_cleanup SET lease_until = NULL, last_error = left(p_error, 1000)
    WHERE contract_id = p_contract_id; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_contract_storage_cleanup(bigint), public.finish_contract_storage_cleanup(bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_contract_storage_cleanup(bigint), public.finish_contract_storage_cleanup(bigint, text) TO service_role;

COMMIT;
