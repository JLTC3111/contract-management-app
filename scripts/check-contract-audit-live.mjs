import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

// Reports only status codes and maintenance counters; never keys or documents.
const env = dotenv.parse(readFileSync(new URL('../.env', import.meta.url)));
const base = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
if (!base || !anon) throw new Error('Missing project configuration');
const headers = (token = anon) => ({ apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
const post = (path, options = {}) => fetch(`${base}${path}`, { method: 'POST', ...options });

let result = await fetch(`${base}/functions/v1/contract-status-cron`, { method: 'OPTIONS' });
assert.equal(result.status, 204);
assert.match(result.headers.get('Access-Control-Allow-Headers'), /apikey/i);
result = await post('/functions/v1/contract-status-cron');
assert.equal(result.status, 401);
result = await post('/functions/v1/contract-status-cron', { headers: headers() });
assert.equal(result.status, 401);
result = await post('/functions/v1/contract-delete');
assert.equal(result.status, 401);
console.log('Anonymous maintenance and contract deletion are denied; Supabase preflight works.');

const oldFile = process.argv.find((argument) => argument.startsWith('--old-token-file='))?.split('=').slice(1).join('=');
if (oldFile) {
  const old = readFileSync(oldFile, 'utf8').trim();
  result = await post('/functions/v1/contract-status-cron', { headers: headers(old) });
  assert.equal(result.status, 401);
  console.log('The exposed former cron credential is rejected.');
}

result = await post('/storage/v1/object/list/contracts', {
  headers: headers(), body: JSON.stringify({ prefix: 'uploads', limit: 1, offset: 0 }),
});
assert.equal(result.status, 200);
assert.deepEqual(await result.json(), []);
result = await fetch(`${base}/rest/v1/contract_comments?select=id&limit=1`, { headers: headers() });
assert.ok([401, 403].includes(result.status));
console.log('Anonymous document enumeration and comment reads are blocked.');

// Explicitly opted in: this executes the application's normal status job.
if (process.argv.includes('--maintenance')) {
  if (!env.CONTRACT_CRON_SECRET) throw new Error('Missing server maintenance credential');
  for (let attempt = 0; attempt < 2; attempt++) {
    result = await post('/functions/v1/contract-status-cron', { headers: headers(env.CONTRACT_CRON_SECRET), body: '{}' });
    assert.equal(result.status, 200, 'The authenticated maintenance job failed');
    const body = await result.json();
    const counters = Object.fromEntries(['updated_count', 'expired_count', 'expiring_count', 'notifications_sent', 'documents_cleaned', 'cleanup_pending']
      .map((key) => { assert.equal(typeof body[key], 'number', `Missing ${key}`); return [key, body[key]]; }));
    if (attempt === 1) {
      assert.equal(counters.updated_count, 0);
      assert.equal(counters.notifications_sent, 0);
    }
    console.log(JSON.stringify({ maintenanceRun: attempt + 1, ...counters }));
  }
}
