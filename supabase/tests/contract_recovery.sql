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
INSERT INTO auth.users(id,email) VALUES ('20000000-0000-0000-0000-000000000001','recovery-editor@example.test'),
  ('20000000-0000-0000-0000-000000000002','recovery-viewer@example.test');
INSERT INTO public.users(id,role) VALUES ('20000000-0000-0000-0000-000000000001','editor'),
  ('20000000-0000-0000-0000-000000000002','viewer');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
INSERT INTO public.contracts(id,title,status,stage,client_request_id) VALUES
  (2001,'Recovered create','draft','draft','20000000-0000-4000-8000-000000000001');
SELECT pg_temp.fails('INSERT INTO public.contracts(id,title,status,stage,client_request_id) VALUES (2002,''Retry'',''draft'',''draft'',''20000000-0000-4000-8000-000000000001'')',
  '23505','retry cannot duplicate a committed creation');
SELECT pg_temp.ok((SELECT count(*)=1 FROM public.contracts WHERE client_request_id='20000000-0000-4000-8000-000000000001'), 'request lookup returns one committed contract');
SELECT pg_temp.fails('UPDATE public.contracts SET client_request_id=NULL WHERE id=2001', '42501','creation identity is immutable');
INSERT INTO public.contracts(id,title,status,stage) VALUES (2003,'Legacy create','draft','draft'),(2004,'Legacy create 2','draft','draft');
SELECT pg_temp.ok((SELECT count(*)=2 FROM public.contracts WHERE id IN (2003,2004)), 'legacy clients may omit the request ID');
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.fails('INSERT INTO public.contracts(id,title,status,stage,client_request_id) VALUES (2005,''Forbidden'',''draft'',''draft'',''20000000-0000-4000-8000-000000000002'')',
  '42501','request IDs do not bypass viewer write restrictions');
ROLLBACK;
