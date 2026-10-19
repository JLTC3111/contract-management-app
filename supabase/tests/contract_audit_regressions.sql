-- Synthetic records only, rolled back after every check.
BEGIN;
CREATE FUNCTION pg_temp.ok(condition boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'PASS: %', label; END;
$$;
CREATE FUNCTION pg_temp.fails(statement text, expected_code text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_code THEN RAISE NOTICE 'PASS: %', label; RETURN; END IF; RAISE;
  END;
  RAISE EXCEPTION 'FAIL: % did not fail', label;
END;
$$;
INSERT INTO auth.users(id,email) SELECT ('10000000-0000-0000-0000-00000000000' || n)::uuid, 'audit' || n || '@example.test' FROM generate_series(1,4) n;
INSERT INTO public.users(id,email,role) SELECT id,email,CASE right(id::text,1) WHEN '1' THEN 'editor' WHEN '2' THEN 'approver' WHEN '3' THEN 'viewer' ELSE 'staff' END
  FROM auth.users WHERE id::text LIKE '10000000%';
INSERT INTO public.contracts(id,title,status,stage,author) VALUES
  (101,'Submission','draft','draft','audit1@example.test'),
  (102,'Rejection','rejected','in_review','audit1@example.test'),
  (103,'Renewal','expired','executed','audit1@example.test'),
  (104,'Warning phases','approved','awaiting_signature','audit1@example.test'),
  (105,'Legacy expiry','completed','executed','audit1@example.test'),
  (106,'Atomic failure','draft','draft','audit1@example.test'),
  (107,'No expiry','draft','draft','audit1@example.test');
UPDATE public.contracts SET expiry_date=CURRENT_DATE-1 WHERE id=103;
UPDATE public.contracts SET expiry_date=CURRENT_DATE+2 WHERE id=104;
-- Simulate an old writer that only knows expiration_date.
UPDATE public.contracts SET expiration_date=CURRENT_DATE-1 WHERE id=105;
INSERT INTO public.contract_phases(id,contract_id,phase_number,name,status) VALUES
  (1041,104,1,'First','active'),(1042,104,2,'Next','pending');
INSERT INTO public.contract_comments(contract_id,user_id,comment) VALUES (101,'10000000-0000-0000-0000-000000000001','Private discussion');
INSERT INTO storage.objects(bucket_id,name) VALUES ('contracts','uploads/101/terms.pdf'),('contracts','uploads/999/missing.pdf'),('other-app','public.pdf');

SELECT pg_temp.ok((SELECT NOT public AND file_size_limit=52428800 AND allowed_mime_types IS NOT NULL FROM storage.buckets WHERE id='contracts'),'contract bucket is private and upload limits are configured');
SELECT pg_temp.ok((SELECT public FROM storage.buckets WHERE id='other-app'),'other app bucket configuration preserved');
SET LOCAL ROLE anon;
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='contracts')=0,'anonymous contract enumeration denied despite legacy policy');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='other-app')=1,'other app anonymous policy preserved');
SELECT pg_temp.fails('SELECT * FROM public.contract_comments','42501','anonymous comments denied');
SELECT pg_temp.fails('SELECT public.request_contract_approval(101,''Review'',0)','42501','anonymous submission denied');
SELECT pg_temp.fails('SELECT public.claim_contract_storage_cleanup(NULL)','42501','anonymous cleanup RPC denied');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.ok((SELECT count(*) FROM public.contract_comments)=0,'account without contract role cannot read comments');
SELECT pg_temp.fails('INSERT INTO public.contract_comments(contract_id,user_id,comment) VALUES (101,auth.uid(),''Wrong'')','42501','account without contract role cannot write comments');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='contracts')=0,'account without contract role cannot read documents');
SELECT pg_temp.fails('INSERT INTO storage.objects(bucket_id,name) VALUES (''contracts'',''uploads/101/wrong.pdf'')','42501','account without contract role cannot upload documents');
SELECT pg_temp.fails('SELECT public.request_contract_approval(101,''Wrong'',0)','42501','account without contract role cannot request approval');

SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.ok((SELECT count(*) FROM public.contract_comments)=1,'viewer reads parent contract discussion');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='contracts')=1,'viewer reads only documents attached to existing contracts');
SELECT pg_temp.fails('INSERT INTO storage.objects(bucket_id,name) VALUES (''contracts'',''uploads/101/wrong.pdf'')','42501','viewer upload denied despite broad legacy insert policy');
DELETE FROM storage.objects WHERE bucket_id='contracts';
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='contracts')=1,'viewer delete denied despite broad legacy delete policy');
UPDATE storage.objects SET name='uploads/101/wrong.pdf' WHERE bucket_id='contracts';
SELECT pg_temp.ok((SELECT name='uploads/101/terms.pdf' FROM storage.objects WHERE bucket_id='contracts'),'viewer overwrite denied');
SELECT pg_temp.fails('SELECT public.claim_contract_storage_cleanup(NULL)','42501','signed-in cleanup RPC denied');

SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.fails('INSERT INTO storage.objects(bucket_id,name) VALUES (''contracts'',''uploads/101/wrong.pdf'')','42501','approver upload denied');
DELETE FROM storage.objects WHERE bucket_id='contracts';
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='contracts')=1,'approver delete denied');

SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
INSERT INTO storage.objects(bucket_id,name) VALUES ('contracts','uploads/101/Legal/.keep');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='contracts')=2,'editor uploads into nested contract folders');
SELECT pg_temp.fails('INSERT INTO storage.objects(bucket_id,name) VALUES (''contracts'',''uploads/999/wrong.pdf'')','42501','editor upload to nonexistent contract denied');
SELECT pg_temp.fails('INSERT INTO storage.objects(bucket_id,name) VALUES (''contracts'',''uploads/not-an-id/wrong.pdf'')','42501','invalid contract prefix denied');
DELETE FROM storage.objects WHERE bucket_id='contracts' AND name='uploads/101/Legal/.keep';
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id='contracts')=1,'editor can delete contract document');

SELECT public.request_contract_approval(101,'Review',0);
SELECT pg_temp.ok((SELECT stage='in_review' AND status='pending' AND revision=1 FROM public.contracts WHERE id=101),'submission atomically moves Draft to In Review');
SELECT pg_temp.ok((SELECT requested_revision=1 AND requested_stage='in_review' FROM public.contract_approval_requests WHERE contract_id=101),'approval snapshots the submitted revision and stage');
SELECT public.request_contract_approval(101,'Retry',0);
SELECT pg_temp.ok((SELECT count(*) FROM public.contract_approval_requests WHERE contract_id=101)=1,'submission retry reuses pending request');
SELECT pg_temp.fails('INSERT INTO public.contract_approval_requests(contract_id,requester_id,status) VALUES (101,auth.uid(),''pending'')','23505','database blocks duplicate direct submissions');
UPDATE public.contracts SET title='Edited after submission' WHERE id=101;
SELECT pg_temp.ok((SELECT status='superseded' FROM public.contract_approval_requests WHERE contract_id=101),'editing the reviewed revision supersedes the pending request');
SELECT pg_temp.fails('SELECT public.request_contract_approval(101,''Stale'',1)','40001','stale approval submission rejected');
SELECT pg_temp.ok((SELECT revision=2 FROM public.contracts WHERE id=101),'business edit increments contract revision');
UPDATE public.contracts SET title='Stale overwrite' WHERE id=101 AND revision=1;
SELECT pg_temp.ok((SELECT title='Edited after submission' FROM public.contracts WHERE id=101),'stale compare-and-swap cannot overwrite contract');
SELECT public.request_contract_approval(101,'Updated review',2);
SELECT pg_temp.ok((SELECT count(*) FROM public.contract_approval_requests WHERE contract_id=101 AND status='pending')=1,'edited contract can be resubmitted');

SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.fails('SELECT public.decide_contract_approval((SELECT id FROM public.contract_approval_requests WHERE contract_id=101 AND status=''superseded''),''approved'')','55000','superseded request cannot advance contract');
SELECT public.decide_contract_approval((SELECT id FROM public.contract_approval_requests WHERE contract_id=101 AND status='pending'),'approved');
SELECT pg_temp.ok((SELECT stage='negotiation' AND status='in_progress' FROM public.contracts WHERE id=101),'fresh request advances exactly one stage');

SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
UPDATE public.contracts SET title='Renamed rejection' WHERE id=102;
SELECT pg_temp.ok((SELECT status='rejected' AND stage='in_review' AND lifecycle_status='rejected' FROM public.contracts WHERE id=102),'ordinary metadata edit preserves rejection');
UPDATE public.contracts SET expiry_date=CURRENT_DATE-1 WHERE id=102;
UPDATE public.contracts SET expiry_date=CURRENT_DATE+365 WHERE id=102;
SELECT pg_temp.ok((SELECT status='rejected' AND lifecycle_status='rejected' FROM public.contracts WHERE id=102),'expiry renewal preserves underlying rejection');
UPDATE public.contracts SET expiry_date=CURRENT_DATE+365 WHERE id=103;
SELECT pg_temp.ok((SELECT status='completed' AND stage='executed' FROM public.contracts WHERE id=103),'extending expired date restores executed lifecycle');
UPDATE public.contracts SET expiry_date=CURRENT_DATE-1 WHERE id=103;
UPDATE public.contracts SET expiry_date=NULL WHERE id=103;
SELECT pg_temp.ok((SELECT status='completed' AND expiry_date IS NULL AND expiration_date IS NULL FROM public.contracts WHERE id=103),'clearing expiry removes override and clears legacy date');
SELECT pg_temp.ok((SELECT expiry_date=expiration_date AND status='expired' FROM public.contracts WHERE id=105),'legacy expiration_date writes are synchronized and evaluated');

UPDATE public.contract_phases SET status='completed' WHERE id=1041;
SELECT pg_temp.ok((SELECT stage='negotiation' AND lifecycle_status='in_progress' AND status='expiring' FROM public.contracts WHERE id=104),'partial phases synchronize lifecycle without clearing warning');
UPDATE public.contract_phases SET status='completed' WHERE id=1042;
SELECT pg_temp.ok((SELECT stage='executed' AND lifecycle_status='completed' AND status='expiring' FROM public.contracts WHERE id=104),'all phases synchronize executed stage while expiry wins');
UPDATE public.contracts SET expiry_date=CURRENT_DATE+365 WHERE id=104;
SELECT pg_temp.ok((SELECT stage='executed' AND status='completed' FROM public.contracts WHERE id=104),'phase-completed renewal restores completed status');

RESET ROLE;
CREATE FUNCTION pg_temp.reject_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.contract_id=106 THEN RAISE EXCEPTION 'Injected submission failure' USING ERRCODE='23514'; END IF; RETURN NEW; END;
$$;
CREATE TRIGGER z_reject_submission BEFORE INSERT ON public.contract_approval_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_submission();
SET LOCAL ROLE authenticated;
SELECT pg_temp.fails('SELECT public.request_contract_approval(106,''Review'',0)','23514','request insert failure propagates');
SELECT pg_temp.ok((SELECT stage='draft' AND status='draft' AND revision=0 FROM public.contracts WHERE id=106),'request failure rolls back initial transition and revision');
SELECT pg_temp.ok((SELECT count(*) FROM public.contract_approval_requests WHERE contract_id=106)=0,'request failure leaves no orphan pending request');
DELETE FROM public.contracts WHERE id=107;
SELECT pg_temp.fails('SELECT * FROM private.contract_storage_cleanup','42501','cleanup outbox is private');
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) FROM private.contract_storage_cleanup WHERE contract_id=107)=1,'contract deletion durably queues complete-folder cleanup');
SELECT pg_temp.fails('INSERT INTO public.contracts(id,title,status,stage) VALUES (107,''Reused ID'',''draft'',''draft'')','55000','pending cleanup prevents reuse of a deleted contract identity');
SET LOCAL ROLE service_role;
SELECT pg_temp.ok((SELECT count(*) FROM public.claim_contract_storage_cleanup(107))=1,'service worker can claim deleted contract cleanup');
SELECT pg_temp.ok((SELECT lease_until > now() + interval '400 seconds' FROM private.contract_storage_cleanup WHERE contract_id=107),'cleanup lease outlasts the worker maximum runtime');
SELECT pg_temp.ok((SELECT count(*) FROM public.claim_contract_storage_cleanup(107))=0,'claimed cleanup is not duplicated by another worker');
SELECT public.finish_contract_storage_cleanup(107,'Temporary storage outage');
SELECT pg_temp.ok((SELECT count(*) FROM public.claim_contract_storage_cleanup(107))=1,'failed cleanup remains retryable');
SELECT public.finish_contract_storage_cleanup(107,NULL);
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) FROM private.contract_storage_cleanup WHERE contract_id=107)=0,'successful cleanup clears durable job');
ROLLBACK;
