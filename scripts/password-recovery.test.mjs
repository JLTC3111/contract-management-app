import assert from 'node:assert/strict';
import test from 'node:test';
import { createPasswordRecovery } from '../src/utils/passwordRecovery.js';

const sessionFor = (id = 'account-a') => ({ user: { id, email: `${id}@example.test` } });
const recoveryUrl = 'http://localhost/login#type=recovery&access_token=test-access&refresh_token=test-refresh';

function fixture({ url = 'http://localhost/login', session = null, storage = new Map(), initializeError = null } = {}) {
  const callbacks = new Set();
  const updates = [];
  const auth = {
    session,
    updateError: null,
    async initialize() { return { error: initializeError }; },
    async getSession() { return { data: { session: this.session }, error: null }; },
    onAuthStateChange(callback) {
      callbacks.add(callback);
      return { data: { subscription: { unsubscribe: () => callbacks.delete(callback) } } };
    },
    async updateUser(change) {
      updates.push(change);
      if (!this.updateError) this.emit('USER_UPDATED', this.session);
      return { data: { user: this.session?.user }, error: this.updateError };
    },
    emit(event, nextSession) {
      this.session = nextSession;
      callbacks.forEach((callback) => callback(event, nextSession));
    },
  };
  const browser = {
    location: { href: url },
    sessionStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
  return { auth, browser, storage, updates, recovery: createPasswordRecovery(auth, browser) };
}

test('ordinary sign-in does not open password recovery', async () => {
  const { auth, recovery } = fixture({ session: sessionFor() });
  await recovery.initialized;
  auth.emit('SIGNED_IN', sessionFor());
  assert.equal(recovery.getSnapshot(), null);
});

test('a recovery event opens the form even without a URL fragment', async () => {
  const { auth, recovery, storage } = fixture();
  await recovery.initialized;
  auth.emit('PASSWORD_RECOVERY', sessionFor());
  assert.equal(recovery.getSnapshot().status, 'ready');
  assert.deepEqual([...storage.values()], ['account-a']);
});

test('a verified recovery link works even if the SDK event preceded the UI', async () => {
  const { recovery } = fixture({ url: recoveryUrl, session: sessionFor() });
  assert.equal(recovery.getSnapshot().status, 'pending');
  await recovery.initialized;
  assert.equal(recovery.getSnapshot().userId, 'account-a');
});

test('reload resumes recovery for the same account, then saving clears it', async () => {
  const first = fixture({ url: recoveryUrl, session: sessionFor() });
  await first.recovery.initialized;
  first.recovery.dispose();
  const reload = fixture({ storage: first.storage, session: sessionFor() });
  await reload.recovery.initialized;
  assert.equal(reload.recovery.getSnapshot().status, 'ready');
  const result = await reload.recovery.updatePassword('new-test-password');
  assert.equal(result.error, null);
  assert.deepEqual(reload.updates, [{ password: 'new-test-password' }]);
  assert.equal(reload.recovery.getSnapshot().status, 'complete');
  const afterSave = fixture({ storage: first.storage, session: sessionFor() });
  await afterSave.recovery.initialized;
  assert.equal(afterSave.recovery.getSnapshot(), null);
});

test('an expired link cannot use a previously signed-in account', async () => {
  const { recovery, updates } = fixture({
    url: 'http://localhost/login#error=access_denied&error_code=otp_expired&error_description=Link+expired',
    session: sessionFor(),
  });
  await recovery.initialized;
  assert.equal(recovery.getSnapshot().status, 'invalid');
  assert.ok((await recovery.updatePassword('new-test-password')).error);
  assert.deepEqual(updates, []);
});

test('incomplete recovery links cannot update the existing session', async () => {
  const { recovery, updates } = fixture({ url: 'http://localhost/login#type=recovery', session: sessionFor() });
  await recovery.initialized;
  assert.equal(recovery.getSnapshot().status, 'invalid');
  await recovery.updatePassword('new-test-password');
  assert.deepEqual(updates, []);
});

test('tokens rejected during initialization do not enable recovery', async () => {
  const { recovery } = fixture({ url: recoveryUrl, session: sessionFor(), initializeError: { code: 'bad_jwt' } });
  await recovery.initialized;
  assert.equal(recovery.getSnapshot().status, 'invalid');
});

test('a reload cannot carry recovery into a different account', async () => {
  const first = fixture({ url: recoveryUrl, session: sessionFor() });
  await first.recovery.initialized;
  const reload = fixture({ storage: first.storage, session: sessionFor('account-b') });
  await reload.recovery.initialized;
  assert.equal(reload.recovery.getSnapshot().status, 'invalid');
  assert.equal(first.storage.size, 0);
});

test('sign-out or an account change invalidates an open recovery form', async () => {
  for (const [event, session] of [['SIGNED_OUT', null], ['SIGNED_IN', sessionFor('account-b')]]) {
    const { auth, recovery } = fixture({ url: recoveryUrl, session: sessionFor() });
    await recovery.initialized;
    auth.emit(event, session);
    assert.equal(recovery.getSnapshot().status, 'invalid');
  }
});

test('saving rechecks the session in case the account changed in another tab', async () => {
  const { auth, recovery, updates } = fixture({ url: recoveryUrl, session: sessionFor() });
  await recovery.initialized;
  auth.session = sessionFor('account-b');
  assert.ok((await recovery.updatePassword('new-test-password')).error);
  assert.deepEqual(updates, []);
});

test('a server password-policy error leaves the form available to retry', async () => {
  const { auth, recovery } = fixture({ url: recoveryUrl, session: sessionFor() });
  await recovery.initialized;
  auth.updateError = { code: 'weak_password', status: 422 };
  assert.equal((await recovery.updatePassword('weak-password')).error.code, 'weak_password');
  assert.equal(recovery.getSnapshot().status, 'ready');
  auth.updateError = null;
  assert.equal((await recovery.updatePassword('stronger-test-password')).error, null);
  assert.equal(recovery.getSnapshot().status, 'complete');
});

test('a session that expires while saving shows the invalid-link state', async () => {
  const { auth, recovery, storage } = fixture({ url: recoveryUrl, session: sessionFor() });
  await recovery.initialized;
  auth.updateError = { code: 'session_not_found', status: 401 };
  await recovery.updatePassword('new-test-password');
  assert.equal(recovery.getSnapshot().status, 'invalid');
  assert.equal(storage.size, 0);
});

test('dismissing a recovery link clears its reload marker', async () => {
  const { recovery, storage } = fixture({ url: recoveryUrl, session: sessionFor() });
  await recovery.initialized;
  recovery.dismiss();
  assert.equal(recovery.getSnapshot(), null);
  assert.equal(storage.size, 0);
});
