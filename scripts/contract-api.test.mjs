import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { harness } from './helpers/componentHarness.mjs';

test('the real Supabase client returns one decided request for the approval UI', async () => {
  const requests = [];
  const supabase = createClient('http://contract-api.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      requests.push(new URL(input).pathname);
      assert.deepEqual(JSON.parse(options.body), { p_request_id: 10, p_decision: 'approved' });
      const single = new Headers(options.headers).get('Accept') === 'application/vnd.pgrst.object+json';
      const row = { id: 10, contract_id: 20, status: 'approved' };
      return new Response(JSON.stringify(single ? row : [row]), { headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const { approvalsApi } = harness({ supabase }).load('src/api/contracts.js');
  const decided = await approvalsApi.decide(10, 'approved');
  assert.equal(decided.status, 'approved');
  assert.equal(decided.id, 10);
  assert.deepEqual(requests, ['/rest/v1/rpc/decide_contract_approval']);
});

const testClient = (fetch) => createClient('http://contract-api.example.test', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch },
});

test('approval creation makes one atomic RPC call with the reviewed revision', async () => {
  const requests = [];
  const supabase = testClient(async (input, options) => {
    requests.push(new URL(input).pathname);
    assert.deepEqual(JSON.parse(options.body), { p_contract_id: 20, p_message: 'Review', p_expected_revision: 4 });
    return new Response(JSON.stringify({ id: 10, contract_id: 20, status: 'pending' }), { headers: { 'Content-Type': 'application/json' } });
  });
  const result = await harness({ supabase }).load('src/api/contracts.js').approvalsApi.create({ contract_id: 20, message: 'Review', expected_revision: 4 });
  assert.equal(result.id, 10);
  assert.deepEqual(requests, ['/rest/v1/rpc/request_contract_approval']);
});

for (const method of ['getAll', 'getPending']) {
  test(`approval ${method} reads every row through a server cap with stable ordering`, async () => {
    const rows = Array.from({ length: 1123 }, (_, id) => ({ id, status: 'pending' }));
    const ranges = [];
    const supabase = testClient(async (input) => {
      const url = new URL(input);
      assert.equal(url.searchParams.get('order'), 'created_at.desc,id.asc');
      if (method === 'getPending') assert.equal(url.searchParams.get('status'), 'eq.pending');
      const offset = Number(url.searchParams.get('offset'));
      ranges.push(offset);
      const data = rows.slice(offset, offset + 137);
      return new Response(JSON.stringify(data), { headers: {
        'Content-Type': 'application/json', 'Content-Range': `${offset}-${offset + data.length - 1}/${rows.length}`,
      } });
    });
    const loaded = await harness({ supabase }).load('src/api/contracts.js').approvalsApi[method]();
    assert.deepEqual(JSON.parse(JSON.stringify(loaded)), rows);
    assert.ok(ranges.length > 2);
    assert.equal(ranges[1], 137);
  });
}

test('a stale contract edit is rejected instead of overwriting a later decision', async () => {
  const supabase = testClient(async (input, options) => {
    const url = new URL(input);
    assert.equal(options.method, 'PATCH');
    assert.equal(url.searchParams.get('id'), 'eq.20');
    assert.equal(url.searchParams.get('revision'), 'eq.4');
    return new Response(JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows',
      message: 'JSON object requested, multiple (or no) rows returned' }), {
      status: 406, headers: { 'Content-Type': 'application/json' },
    });
  });
  await assert.rejects(harness({ supabase }).load('src/api/contracts.js').contractsApi.update(20, { title: 'Stale' }, { expectedRevision: 4 }), /Reload it before saving/);
});

test('contract deletion calls the server cleanup workflow and retains pending-cleanup feedback', async () => {
  const supabase = { functions: { invoke: async (name, options) => {
    assert.equal(name, 'contract-delete');
    assert.equal(options.body.contract_id, 20);
    assert.equal(options.body.expected_revision, 4);
    return { data: { deleted: true, cleanup_pending: true } };
  } } };
  const result = await harness({ supabase }).load('src/api/contracts.js').contractsApi.delete(20, { expectedRevision: 4 });
  assert.equal(result.cleanup_pending, true);
});
