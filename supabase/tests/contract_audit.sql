-- Run against scripts/fixtures/contract-audit-schema.sql in a disposable DB.
BEGIN;
CREATE FUNCTION pg_temp.check_true(condition boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'PASS: %', label; END;
$$;
CREATE FUNCTION pg_temp.denied(statement text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: %', label; RETURN; END;
  RAISE EXCEPTION 'FAIL: % was allowed', label;
END;
$$;
CREATE FUNCTION pg_temp.affected(statement text, expected integer, label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual integer;
BEGIN EXECUTE statement; GET DIAGNOSTICS actual = ROW_COUNT;
  PERFORM pg_temp.check_true(actual = expected, label);
END;
$$;
CREATE FUNCTION pg_temp.fails(statement text, expected_code text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_code THEN RAISE NOTICE 'PASS: %', label; RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'FAIL: % did not fail', label;
END;
$$;

INSERT INTO auth.users(id, email) SELECT ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'user' || n || '@example.test' FROM generate_series(1,5) n;
INSERT INTO public.users(id, email, role) SELECT id,email, CASE right(id::text,1) WHEN '1' THEN 'admin' WHEN '2' THEN 'editor' WHEN '3' THEN 'approver' WHEN '4' THEN 'viewer' ELSE 'editor' END FROM auth.users;
INSERT INTO public.contracts(id,title,status,stage,author,expiry_date) VALUES
 (10,'Approval','pending','in_review','user2@example.test',CURRENT_DATE + 60),
 (20,'Rollback','pending','in_review','user2@example.test',CURRENT_DATE + 60),
 (30,'Phases','pending','in_review','user2@example.test',CURRENT_DATE + 60),
 (40,'Phase rollback','pending','in_review','user2@example.test',CURRENT_DATE + 60),
 (50,'Executed expired','completed','executed','user2@example.test',CURRENT_DATE - 1),
 (60,'Negotiation warning','in_progress','negotiation','user2@example.test',CURRENT_DATE + 2),
 (70,'Executed warning','completed','executed','user2@example.test',CURRENT_DATE + 2),
 (80,'Negotiation expired','in_progress','negotiation','user2@example.test',CURRENT_DATE - 1);
INSERT INTO public.contract_approval_requests(id,contract_id,requester_id,status) VALUES
 (10,10,'00000000-0000-0000-0000-000000000002','pending'),
 (20,20,'00000000-0000-0000-0000-000000000002','pending');
INSERT INTO public.contract_phases(id,contract_id,phase_number,name,status) VALUES
 (31,30,1,'First','active'),(32,30,2,'Next','pending'),(41,40,1,'First','active'),(42,40,2,'Next','pending');
INSERT INTO public.phase_comments(id,phase_id,user_id,comment) VALUES (1,31,'00000000-0000-0000-0000-000000000002','Owned comment');
INSERT INTO public.phase_resources(id,phase_id,uploaded_by,resource_type,file_name,file_path) VALUES
 (1,31,'00000000-0000-0000-0000-000000000002','document','test.pdf','test.pdf');
INSERT INTO public.phase_milestones(id,phase_id,title) VALUES (1,31,'Milestone');
INSERT INTO public.notifications(id,user_id,title,message) VALUES
 (1,'00000000-0000-0000-0000-000000000002','Own','Test'),(2,'00000000-0000-0000-0000-000000000005','Other','Test');
SELECT setval('public.notifications_id_seq', 100, true);

SET LOCAL ROLE anon;
SELECT pg_temp.denied('SELECT * FROM public.contracts', 'anonymous contract reads denied');
SELECT pg_temp.denied('SELECT public.update_contract_expirations()', 'anonymous expiry RPC denied');
SELECT pg_temp.denied('SELECT public.get_contract_phase_analytics(NULL)', 'anonymous analytics denied');
SELECT pg_temp.denied('SELECT public.decide_contract_approval(10,''approved'')', 'anonymous approval denied');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.check_true((SELECT count(*) FROM public.contracts) = 8, 'viewer reads contracts');
SELECT pg_temp.affected('UPDATE public.contracts SET title = ''wrong'' WHERE id=10',0,'viewer cannot edit contract');
SELECT pg_temp.affected('DELETE FROM public.contracts WHERE id=10',0,'viewer cannot delete contract');
SELECT pg_temp.denied('INSERT INTO public.contracts(title) VALUES (''wrong'')','viewer cannot create contract');
SELECT pg_temp.affected('UPDATE public.contract_phases SET status=''completed'' WHERE id=31',0,'viewer cannot progress phase');
SELECT pg_temp.affected('UPDATE public.phase_milestones SET title=''wrong'' WHERE id=1',0,'viewer cannot edit milestone');
SELECT pg_temp.affected('DELETE FROM public.phase_resources WHERE id=1',0,'viewer cannot delete resource');
SELECT pg_temp.denied('UPDATE public.users SET role=''admin'' WHERE id=auth.uid()','self-promotion denied');
SELECT pg_temp.affected('UPDATE public.users SET full_name=''New name'' WHERE id=auth.uid()',1,'ordinary self-profile editing preserved');
SELECT pg_temp.denied('TRUNCATE public.users','profile truncate denied');
SELECT pg_temp.denied('SELECT public.update_contract_expirations()','signed-in expiry RPC denied');
SELECT pg_temp.denied('SELECT public.decide_contract_approval(10,''approved'')','viewer cannot approve');
SELECT pg_temp.check_true((SELECT count(*) FROM public.notifications) = 0,'other notifications hidden');

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.affected('UPDATE public.contracts SET title=''Edited'' WHERE id=10',1,'editor can edit contract');
SELECT pg_temp.denied('SELECT public.decide_contract_approval(10,''approved'')','editor cannot approve own request');
SELECT pg_temp.denied('UPDATE public.contract_approval_requests SET status=''approved'' WHERE id=10','direct decision write denied');
SELECT pg_temp.check_true((SELECT count(*) FROM public.notifications) = 1,'only own notifications visible');
SELECT pg_temp.affected('UPDATE public.notifications SET read=true WHERE id=1',1,'owner can mark notification read');
SELECT pg_temp.affected('UPDATE public.notifications SET read=true WHERE id=2',0,'cannot mark another notification read');
SELECT pg_temp.denied('UPDATE public.notifications SET user_id=''00000000-0000-0000-0000-000000000005'' WHERE id=1','cannot reassign notification');
SELECT pg_temp.affected('UPDATE public.phase_comments SET comment=''Edited'' WHERE id=1',1,'author can edit own phase comment');

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
SELECT pg_temp.affected('UPDATE public.phase_comments SET comment=''wrong'' WHERE id=1',0,'other editor cannot edit comment');
SELECT pg_temp.affected('DELETE FROM public.phase_resources WHERE id=1',0,'other editor cannot delete resource');
SELECT pg_temp.denied('INSERT INTO public.phase_comments(phase_id,user_id,comment) VALUES (31,''00000000-0000-0000-0000-000000000002'',''wrong'')','comment author spoofing denied');

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.affected('UPDATE public.contracts SET title=''wrong'' WHERE id=10',0,'approver cannot edit contracts directly');
SELECT pg_temp.affected('UPDATE public.contract_approval_requests SET approval_response=''Reviewed'' WHERE id=10',1,'approver can edit response');
SELECT public.decide_contract_approval(10,'approved');
SELECT pg_temp.check_true((SELECT status='approved' FROM public.contract_approval_requests WHERE id=10),'approval persisted');
SELECT pg_temp.check_true((SELECT stage='negotiation' AND status='in_progress' FROM public.contracts WHERE id=10),'approval advances exactly one step');
SELECT pg_temp.fails('SELECT public.decide_contract_approval(10,''approved'')','55000','approval replay rejected');
SELECT pg_temp.check_true((SELECT stage='negotiation' FROM public.contracts WHERE id=10),'replay leaves stage unchanged');

RESET ROLE;
CREATE FUNCTION pg_temp.reject_test_decision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.id=20 THEN RAISE EXCEPTION 'Injected failure' USING ERRCODE='23514'; END IF; RETURN NEW; END;
$$;
CREATE TRIGGER fail_test_decision BEFORE UPDATE ON public.contract_approval_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_decision();
CREATE FUNCTION pg_temp.reject_next_phase() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.id=42 AND NEW.status='active' THEN RAISE EXCEPTION 'Injected failure' USING ERRCODE='23514'; END IF; RETURN NEW; END;
$$;
CREATE TRIGGER fail_test_next_phase BEFORE UPDATE ON public.contract_phases FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_next_phase();
SET LOCAL ROLE authenticated;
SELECT pg_temp.fails('SELECT public.decide_contract_approval(20,''approved'')','23514','decision failure propagates');
SELECT pg_temp.check_true((SELECT stage='in_review' AND status='pending' FROM public.contracts WHERE id=20),'contract rolls back with failed decision');
SELECT pg_temp.check_true((SELECT status='pending' FROM public.contract_approval_requests WHERE id=20),'failed decision remains pending');

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
UPDATE public.contract_phases SET status='completed', progress=100, end_date=now() WHERE id=31;
SELECT pg_temp.check_true((SELECT status='active' FROM public.contract_phases WHERE id=32),'completion starts next phase');
SELECT pg_temp.fails('UPDATE public.contract_phases SET status=''completed'', progress=100 WHERE id=41','23514','next-phase failure propagates');
SELECT pg_temp.check_true((SELECT status='active' AND progress=0 FROM public.contract_phases WHERE id=41),'current phase rolls back when next phase fails');
SELECT pg_temp.check_true((SELECT status='pending' FROM public.contract_phases WHERE id=42),'next phase remains pending after failure');

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.check_true((SELECT updated_count=4 AND expired_count=2 AND expiring_count=2 AND notifications_sent=4 FROM public.update_contract_expirations()),'cron covers negotiation and executed statuses');
SELECT pg_temp.check_true((SELECT updated_count=0 AND notifications_sent=0 FROM public.update_contract_expirations()),'cron rerun does not duplicate notifications');
RESET ROLE;
SELECT pg_temp.check_true((SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.contracts'::regclass,'public.contract_phases'::regclass,'public.phase_comments'::regclass,'public.phase_resources'::regclass,'public.phase_milestones'::regclass,'public.notifications'::regclass,'public.contract_approval_requests'::regclass)),'all contract tables have RLS');
SELECT pg_temp.check_true(NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.get_contract_phase_analytics(integer)'::regprocedure),'analytics uses caller permissions');
ROLLBACK;
