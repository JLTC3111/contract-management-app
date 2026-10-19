import assert from 'node:assert/strict';
import test from 'node:test';
import { maintenanceHandler, deleteContractHandler, removeContractFolder, cleanupContractDocuments } from '../supabase/functions/_shared/contract-maintenance.mjs';

function memoryStorage(names, failRemove = false) {
  const files = new Set(names);
  const events = [];
  return { files, events,
    async list(folder, { limit = 100, offset = 0 } = {}) {
      events.push({ operation: 'list', folder, offset });
      const entries = new Map();
      for (const path of files) {
        if (!path.startsWith(`${folder}/`)) continue;
        const relative = path.slice(folder.length + 1);
        const name = relative.split('/')[0];
        entries.set(name, relative.includes('/') ? { name, id: null, metadata: null }
          : { name, id: path, metadata: { size: 4 } });
      }
      return { data: [...entries.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit) };
    },
    async remove(paths) {
      events.push({ operation: 'remove', paths });
      if (failRemove) return { error: new Error('Storage unavailable') };
      paths.forEach((name) => files.delete(name));
      return { data: [] };
    },
  };
}

function dependencies({ role = 'editor', validSession = true, jobs = [], storage = memoryStorage([]), deleteResult = { id: 7 }, rpcError } = {}) {
  const calls = [];
  const service = {
    from(table) {
      return { select() { return this; }, eq(field, value) { calls.push({ client: 'service', table, field, value }); return this; },
        async single() { return { data: { role } }; }, async maybeSingle() { return { data: null }; } };
    },
    storage: { from(bucket) { assert.equal(bucket, 'contracts'); return storage; } },
    async rpc(name, body) {
      calls.push({ name, body });
      if (rpcError) return { error: rpcError };
      if (name === 'update_contract_expirations') return { data: [{ updated_count: 2, expired_count: 1, expiring_count: 1, notifications_sent: 2 }] };
      if (name === 'claim_contract_storage_cleanup') return { data: jobs };
      return { data: null };
    },
  };
  const caller = {
    auth: { async getUser(token) {
      calls.push({ name: 'getUser', token });
      return validSession && token === 'session-token' ? { data: { user: { id: 'editor', user_metadata: { role: 'admin' } } } }
        : { error: new Error('Invalid JWT') };
    } },
    from(table) {
      return { delete() { calls.push({ client: 'caller', operation: 'delete', table }); return this; },
        eq(field, value) { calls.push({ client: 'caller', table, field, value }); return this; }, select() { return this; },
        async maybeSingle() { return { data: deleteResult }; } };
    },
  };
  return { calls, service,
    env: (name) => ({ SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'anon-key', SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      CONTRACT_CRON_SECRET: 'server-only-rotated-token', CRON_SECRET: 'old-exposed-token' })[name],
    createClient: (_url, key, options) => {
      if (key === 'service-key') return service;
      assert.equal(options.global.headers.Authorization.startsWith('Bearer '), true);
      return caller;
    },
  };
}
const request = (token = 'session-token', body = {}, method = 'POST') => new Request('https://example.test/contract-status-cron', {
  method, headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {},
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});

test('maintenance preflight allows Supabase headers and other methods cannot mutate data', async () => {
  const dep = dependencies();
  const handler = maintenanceHandler(dep);
  const preflight = await handler(request(null, {}, 'OPTIONS'));
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /apikey/);
  assert.equal((await handler(request('session-token', {}, 'GET'))).status, 405);
  assert.equal(dep.calls.length, 0);
});

for (const [label, token, options, status] of [
  ['anonymous callers', null, {}, 401],
  ['invalid sessions', 'forged-token', {}, 401],
  ['the previously exposed cron token', 'old-exposed-token', {}, 401],
  ['viewers despite claimed admin user metadata', 'session-token', { role: 'viewer' }, 403],
  ['approvers', 'session-token', { role: 'approver' }, 403],
  ['accounts from other apps', 'session-token', { role: 'staff' }, 403],
]) {
  test(`maintenance rejects ${label} before privileged work`, async () => {
    const dep = dependencies(options);
    assert.equal((await maintenanceHandler(dep)(request(token))).status, status);
    assert.equal(dep.calls.some((call) => call.name === 'update_contract_expirations'), false);
  });
}

test('verified editors receive the actual expiry result counters', async () => {
  const dep = dependencies();
  const result = await maintenanceHandler(dep)(request());
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.updated_count, 2);
  assert.equal(body.notifications_sent, 2);
  assert.ok(dep.calls.some((call) => call.name === 'getUser'));
});

test('the rotated scheduler token works without pretending to be an end user', async () => {
  const dep = dependencies({ validSession: false });
  assert.equal((await maintenanceHandler(dep)(request('server-only-rotated-token'))).status, 200);
  assert.equal(dep.calls.some((call) => call.name === 'getUser'), false);
});

test('the scheduler credential cannot authorize contract deletion', async () => {
  const dep = dependencies({ validSession: false });
  assert.equal((await deleteContractHandler(dep)(request('server-only-rotated-token', { contract_id: 7 }))).status, 401);
  assert.equal(dep.calls.some((call) => call.operation === 'delete'), false);
});

test('deleting a changed contract returns a conflict and never cleans its files', async () => {
  const dep = dependencies({ deleteResult: null });
  const result = await deleteContractHandler(dep)(request('session-token', { contract_id: 7, expected_revision: 4 }));
  assert.equal(result.status, 409);
  assert.ok(dep.calls.some((call) => call.client === 'caller' && call.field === 'revision' && call.value === 4));
  assert.equal(dep.calls.some((call) => call.name === 'claim_contract_storage_cleanup'), false);
});

test('document deletion snapshots every page and includes nested files and folder markers', async () => {
  const names = Array.from({ length: 241 }, (_, n) => `uploads/7/${String(n).padStart(3, '0')}.pdf`);
  names.push('uploads/7/Legal/.keep', 'uploads/7/Legal/Notes/terms.txt');
  const storage = memoryStorage(names);
  await removeContractFolder(storage, 'uploads/7');
  assert.equal(storage.files.size, 0);
  const firstRemove = storage.events.findIndex((event) => event.operation === 'remove');
  assert.ok(storage.events.slice(0, firstRemove).some((event) => event.offset === 200));
  assert.ok(storage.events.slice(0, firstRemove).some((event) => event.folder === 'uploads/7/Legal/Notes'));
  const removed = storage.events.filter((event) => event.operation === 'remove').flatMap((event) => event.paths);
  assert.deepEqual([...removed].sort(), names.sort());
});

test('a storage failure after deletion is reported and remains queued for retry', async () => {
  const storage = memoryStorage(['uploads/7/terms.pdf'], true);
  const dep = dependencies({ jobs: [{ contract_id: 7 }], storage });
  const result = await deleteContractHandler(dep)(request('session-token', { contract_id: 7, expected_revision: 4 }));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { deleted: true, cleanup_pending: true });
  assert.ok(dep.calls.some((call) => call.name === 'finish_contract_storage_cleanup' && call.body.p_error === 'Storage unavailable'));
  assert.equal(storage.files.size, 1);
  const retryStorage = memoryStorage([...storage.files]);
  const retry = dependencies({ jobs: [{ contract_id: 7 }], storage: retryStorage });
  assert.deepEqual(await cleanupContractDocuments(retry.service), { cleaned: 1, pending: 0 });
  assert.equal(retryStorage.files.size, 0);
});

test('successful deletion uses caller permissions and clears the complete storage folder', async () => {
  const storage = memoryStorage(['uploads/7/Legal/.keep', 'uploads/7/Legal/terms.pdf']);
  const dep = dependencies({ jobs: [{ contract_id: 7 }], storage });
  const result = await deleteContractHandler(dep)(request('session-token', { contract_id: 7, expected_revision: 4 }));
  assert.deepEqual(await result.json(), { deleted: true, cleanup_pending: false });
  assert.equal(storage.files.size, 0);
  assert.ok(dep.calls.some((call) => call.client === 'caller' && call.operation === 'delete'));
  assert.equal(dep.calls.some((call) => call.client === 'service' && call.operation === 'delete'), false);
});
