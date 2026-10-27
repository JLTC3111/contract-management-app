import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createBrowserStorage } from '../src/utils/browserStorage.js';
import { createAuthStorage, signOutClient } from '../src/utils/authSession.js';
import { fetchWithDeadline, setSessionVerified, withDeadline } from '../src/utils/network.js';
import { harness } from './helpers/componentHarness.mjs';

const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('restricted storage retains in-memory preferences and hides values that cannot be removed', () => {
  const values = memoryStorage(); values.setItem('old', 'stale');
  const storage = createBrowserStorage(() => ({ getItem: values.getItem, setItem() { throw new Error('Quota'); }, removeItem() { throw new Error('Denied'); } }));
  assert.equal(storage.setItem('theme', 'dark'), false);
  assert.equal(storage.getItem('theme'), 'dark');
  storage.removeItem('old'); assert.equal(storage.getItem('old'), null);
  const blocked = createBrowserStorage(() => { throw new Error('SecurityError'); });
  assert.equal(blocked.getItem('anything'), null);
  blocked.setItem('new', 'value'); assert.equal(blocked.getItem('new'), 'value');
});

test('offline logout clears the real SDK session and rejects late token writes until explicit sign-in', async (t) => {
  const storage = memoryStorage();
  const key = 'sb-recovery-test-auth-token';
  const adapter = createAuthStorage(key, storage);
  const user = { id: 'e354f96e-0b78-4c37-bf6c-992c1ed006da', email: 'test@example.test', aud: 'authenticated', role: 'authenticated' };
  const session = { access_token: 'test-token', refresh_token: 'test-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user };
  adapter.setItem(key, JSON.stringify(session));
  let remoteLogoutToken;
  const client = createClient('http://recovery.example.test', 'test-key', {
    auth: { storage: adapter, storageKey: key, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      if (new URL(input).pathname.endsWith('/logout')) {
        remoteLogoutToken = new Headers(options.headers).get('Authorization');
        return json({ message: 'Service unavailable' }, 503);
      }
      return json(session);
    } },
  });
  t.after(() => client.auth.stopAutoRefresh());
  await client.auth.initialize();
  assert.equal((await client.auth.getSession()).data.session.user.id, user.id);
  const result = await signOutClient(client.auth, adapter);
  assert.ok(result.error);
  assert.equal(remoteLogoutToken, 'Bearer test-token');
  assert.equal((await client.auth.getSession()).data.session, null);
  assert.equal(storage.getItem(key), null);
  adapter.setItem(key, JSON.stringify(session));
  assert.equal(adapter.getItem(key), null);
  const reopened = createAuthStorage(key, storage);
  assert.equal(reopened.getItem(key), null);
  reopened.allowSignIn();
  const signedIn = await client.auth.signInWithPassword({ email: user.email, password: 'fixture-password' });
  assert.equal(signedIn.error, null);
  assert.equal((await client.auth.getSession()).data.session.user.id, user.id);
});

test('request deadline releases callers and aborts an unresponsive network request', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let signal;
  globalThis.fetch = (_input, options) => { signal = options.signal; return new Promise(() => {}); };
  await assert.rejects(fetchWithDeadline('https://recovery.example.test/rest/v1/contracts', {}, 20), { code: 'request_timeout' });
  assert.equal(signal.aborted, true);
  await assert.rejects(withDeadline(new Promise(() => {}), 20), { code: 'request_timeout' });
});

test('a stalled response body is covered by the request deadline', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(new ReadableStream({ start() {} }));
  await assert.rejects(fetchWithDeadline('https://recovery.example.test/rest/v1/contracts', {}, 20), { code: 'request_timeout' });
});

test('unverified sessions cannot mutate contract data while password recovery remains available', async (t) => {
  const original = globalThis.fetch; let calls = 0;
  t.after(() => { globalThis.fetch = original; setSessionVerified(false); });
  globalThis.fetch = async () => { calls++; return json({ ok: true }); };
  setSessionVerified(false);
  await assert.rejects(fetchWithDeadline('https://recovery.example.test/rest/v1/contracts', { method: 'POST' }), { code: 'session_unverified' });
  assert.equal(calls, 0);
  await fetchWithDeadline('https://recovery.example.test/auth/v1/user', { method: 'PUT' });
  assert.equal(calls, 1);
  setSessionVerified(true);
  await fetchWithDeadline('https://recovery.example.test/rest/v1/contracts', { method: 'PATCH' });
  assert.equal(calls, 2);
});

test('creation reconciles a lost response and reuses one server-enforced operation key', async () => {
  const requestId = '10000000-0000-4000-8000-000000000001';
  let row; let inserts = 0;
  const client = createClient('http://recovery-create.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, options) => {
      const url = new URL(input);
      if (options.method === 'POST') {
        inserts++;
        const body = JSON.parse(options.body); assert.equal(body.client_request_id, requestId);
        if (row) return json({ code: '23505', message: 'Duplicate request ID' }, 409);
        row = { ...body, id: 30, revision: 0 };
        throw new TypeError('Response lost after commit');
      }
      assert.equal(url.searchParams.get('client_request_id'), `eq.${requestId}`);
      return json([row]);
    } },
  });
  const api = harness({ supabase: client }).load('src/api/contracts.js').contractsApi;
  const first = await api.create({ title: 'Agreement' }, { requestId });
  const retry = await api.create({ title: 'Agreement' }, { requestId });
  assert.equal(first.id, retry.id); assert.equal(inserts, 2);
});

test('an uncertain edit is reconciled without reapplying a lifecycle transition', async () => {
  let patches = 0;
  const client = createClient('http://recovery-edit.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (_input, options) => {
      if (options.method === 'PATCH') { patches++; throw new TypeError('Response lost after commit'); }
      return json({ id: 20, title: 'Saved title', revision: 5, stage: 'in_review', status: 'rejected' });
    } },
  });
  const api = harness({ supabase: client }).load('src/api/contracts.js').contractsApi;
  const row = await api.update(20, { title: 'Saved title' }, { expectedRevision: 4 });
  assert.equal(row.revision, 5); assert.equal(row.status, 'rejected'); assert.equal(patches, 1);
});

test('conflict merging retains only edited fields and makes competing edits explicit', () => {
  const merge = harness().load('src/utils/contractRecovery.js').mergeContractDraft;
  const base = { id: 20, title: 'Original', author: 'Alice', client_name: 'Client', stage: 'draft', status: 'draft', revision: 4 };
  const mine = { title: 'My title', category: 'Non-Disclosure Agreement', stage: 'draft', author: 'Alice', client_name: 'Client', contract_value: '', expiry_date: '' };
  const latest = { ...base, title: 'Their title', author: 'Bob', stage: 'in_review', status: 'pending', revision: 5 };
  const result = merge(base, mine, latest);
  assert.equal(result.merged.title, 'My title');
  assert.equal(result.merged.author, 'Bob');
  assert.equal(result.merged.stage, 'in_review');
  assert.deepEqual(Array.from(result.conflicts, (item) => item.key), ['title']);
});

test('permission failures are never reported as a successful reconciled write', async () => {
  let reads = 0;
  const client = createClient('http://recovery-forbidden.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (_input, options) => {
      if (options.method === 'PATCH') return json({ code: '42501', message: 'Permission denied' }, 403);
      reads++; return json({ id: 20, title: 'Same title', revision: 5 });
    } },
  });
  const api = harness({ supabase: client }).load('src/api/contracts.js').contractsApi;
  await assert.rejects(api.update(20, { title: 'Same title' }, { expectedRevision: 4 }), (error) => error.code === '42501');
  assert.equal(reads, 0);
});

test('restoring a draft requires a choice and a cleared draft is not recreated during unmount', async () => {
  const storage = memoryStorage();
  const key = 'contract.draft:editor:new';
  storage.setItem(key, JSON.stringify({ version: 1, value: 'unfinished' }));
  let restored;
  const app = harness({ globals: { localStorage: storage } });
  const hook = app.load('src/hooks/useDraftRecovery.js').useDraftRecovery;
  const render = () => app.render(() => hook({ accountId: 'editor', scope: 'new', value: 'current', dirty: true, onRestore: (value) => { restored = value; } }));
  let draft = render(); await app.runEffects();
  assert.equal(draft.pending, true); assert.equal(restored, undefined);
  draft.restore(); draft = render();
  assert.equal(restored, 'unfinished'); assert.equal(draft.pending, false);
  draft.checkpoint('committed'); draft.clear(); await app.runEffects();
  assert.equal(storage.getItem(key), null);
  assert.equal(app.load('src/hooks/useDraftRecovery.js').readDraft('contract.draft:another-account:new'), null);
});

test('partial attachment retry retains failed File objects and never overwrites different existing content', async () => {
  const first = new File(['first'], 'one.pdf', { type: 'application/pdf' });
  const second = new File(['second'], 'two.pdf', { type: 'application/pdf' });
  const uploads = [];
  const app = harness({ api: { storageApi: {
    upload: async (name) => { uploads.push(name); if (name.endsWith('two.pdf')) throw { statusCode: '409', message: 'Exists' }; },
    download: async () => new Blob(['different']),
  } } });
  const result = await app.load('src/utils/uploads.js').uploadAttachments(20, [first, second]);
  assert.equal(result.uploaded[0], 'one.pdf'); assert.equal(result.failed[0].file, second);
  assert.equal(uploads.length, 2);
});
