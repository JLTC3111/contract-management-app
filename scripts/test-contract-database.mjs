import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
  const checks = query(readFileSync(new URL('../supabase/tests/contract_audit.sql', import.meta.url), 'utf8'));
  const count = (checks.stderr.match(/PASS:/g) || []).length;
  console.log(`${count} database permission and rollback checks passed.`);

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
} finally {
  docker(['stop', container]);
}
