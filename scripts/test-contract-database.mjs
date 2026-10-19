import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const container = `contract-audit-test-${process.pid}`;
const docker = (args, input) => {
  const result = spawnSync('docker', args, { input, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker command failed');
  return result;
};
const psqlArgs = ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A'];
const query = (sql) => docker(psqlArgs, sql);
const concurrentQuery = (sql) => new Promise((resolve, reject) => {
  const child = spawn('docker', psqlArgs);
  let error = '';
  child.stderr.on('data', (chunk) => { error += chunk; });
  child.stdout.resume();
  child.on('error', reject);
  child.on('close', (code) => resolve({ code, error }));
  child.stdin.end(sql);
});

docker(['run', '--rm', '--detach', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17']);
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    // The image starts a temporary socket-only server during initialization.
    // TCP readiness means initialization has finished and the final server is up.
    const ready = spawnSync('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']);
    if (ready.status === 0) break;
    if (attempt === 49) throw new Error('Test database did not become ready');
    await delay(100);
  }
  const schema = [
    'scripts/fixtures/contract-audit-schema.sql', 'SQL/contract_phases_schema.sql',
    'SQL/update_contract_expirations.sql',
    'supabase/migrations/20260923123505_audit_contract_permissions_and_transitions.sql',
  ].map((name) => readFileSync(new URL(name, `file://${root}`), 'utf8')).join('\n');
  query(schema);
  query(`
    INSERT INTO public.contracts(id,title,status,stage,expiration_date) VALUES
      (800,'Legacy expiry','completed','executed',CURRENT_DATE-1),
      (801,'Legacy duplicate requests','pending','in_review',NULL),
      (802,'Legacy phase drift','completed','in_review',NULL);
    INSERT INTO public.contract_approval_requests(id,contract_id,status) VALUES (8011,801,'pending'),(8012,801,'pending');
  `);
  for (const name of readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((name) => name > '20260923123505_audit_contract_permissions_and_transitions.sql' && name.endsWith('.sql')).sort()) {
    query(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  assert.equal(query('SELECT expiry_date=expiration_date AND lifecycle_status=\'completed\' FROM public.contracts WHERE id=800;').stdout.trim(), 't');
  assert.equal(query("SELECT count(*) FROM public.contract_approval_requests WHERE contract_id=801 AND status='pending';").stdout.trim(), '1');
  assert.equal(query('SELECT stage FROM public.contracts WHERE id=802;').stdout.trim(), 'executed');
  assert.equal(query('SELECT expired_count FROM public.update_contract_expirations();').stdout.trim(), '1');
  assert.equal(query('SELECT status FROM public.contracts WHERE id=800;').stdout.trim(), 'expired');
  query('DELETE FROM public.contracts WHERE id IN (800,801,802); DELETE FROM private.contract_storage_cleanup;');
  console.log('Legacy date backfill, phase repair, duplicate retirement, and expiry migration checks passed.');
  const checks = query(readFileSync(new URL('../supabase/tests/contract_audit.sql', import.meta.url), 'utf8'));
  const count = (checks.stderr.match(/PASS:/g) || []).length;
  console.log(`${count} database permission and rollback checks passed.`);
  const regressions = query(readFileSync(new URL('../supabase/tests/contract_audit_regressions.sql', import.meta.url), 'utf8'));
  console.log(`${(regressions.stderr.match(/PASS:/g) || []).length} audit regression checks passed.`);

  query(`
    INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-000000000003','approver@example.test');
    INSERT INTO public.users(id,role) VALUES ('00000000-0000-0000-0000-000000000003','approver');
    INSERT INTO public.contracts(id,title,status,stage) VALUES (900,'Concurrency test','pending','in_review');
    INSERT INTO public.contract_approval_requests(id,contract_id,status) VALUES (900,900,'pending');
  `);
  const decision = `BEGIN; SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
    SELECT public.decide_contract_approval(900,'approved'); SELECT pg_sleep(0.15); COMMIT;`;
  const results = await Promise.all([concurrentQuery(decision), concurrentQuery(decision)]);
  assert.equal(results.filter((result) => result.code === 0).length, 1);
  assert.ok(results.some((result) => result.error.includes('already been decided')));
  assert.equal(query('SELECT stage FROM public.contracts WHERE id=900;').stdout.trim(), 'negotiation');
  console.log('Concurrent approval requests advance the contract only once.');

  query(`
    INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-000000000002','editor@example.test');
    INSERT INTO public.users(id,role,email) VALUES ('00000000-0000-0000-0000-000000000002','editor','editor@example.test');
    INSERT INTO public.contracts(id,title,status,stage) VALUES (901,'Concurrent submissions','draft','draft');
  `);
  const submission = `BEGIN; SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
    SELECT public.request_contract_approval(901,'Review',0); SELECT pg_sleep(0.15); COMMIT;`;
  const submitted = await Promise.all([concurrentQuery(submission), concurrentQuery(submission)]);
  assert.ok(submitted.every((result) => result.code === 0), submitted.map((result) => result.error).join('\n'));
  assert.equal(query("SELECT count(*) FROM public.contract_approval_requests WHERE contract_id=901 AND status='pending';").stdout.trim(), '1');
  assert.equal(query('SELECT stage FROM public.contracts WHERE id=901;').stdout.trim(), 'in_review');
  console.log('Concurrent submissions return one pending request and one initial transition.');
} finally {
  docker(['stop', container]);
}
