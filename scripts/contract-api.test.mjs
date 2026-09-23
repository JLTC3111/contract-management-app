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
