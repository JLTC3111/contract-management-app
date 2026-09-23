import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createPasswordRecovery } from '../src/utils/passwordRecovery.js';

// Exercise the installed SDK's URL parsing, session storage and auth events in
// Node. All HTTP responses and browser globals here are isolated test fixtures.
const originalGlobals = new Map(['window', 'document', 'BroadcastChannel'].map((key) =>
  [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
Object.assign(globalThis, {
  window: { location: new URL('http://localhost/login'), addEventListener() {}, removeEventListener() {} },
  document: { visibilityState: 'hidden' },
  BroadcastChannel: undefined,
});
after(() => {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

const user = { id: 'e354f96e-0b78-4c37-bf6c-992c1ed006da', email: 'recovery@example.test', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} };
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const token = [
  { alg: 'HS256', typ: 'JWT' }, { sub: user.id, exp: expiresAt, role: 'authenticated' },
].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.test-signature';
const session = { access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at: expiresAt, token_type: 'bearer', user };
const recoveryUrl = `http://localhost/login#${new URLSearchParams({
  access_token: token, refresh_token: session.refresh_token, expires_in: '3600',
  expires_at: String(expiresAt), token_type: 'bearer', type: 'recovery',
})}`;
const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

function fixture(t) {
  const storage = memoryStorage();
  window.sessionStorage = memoryStorage();
  let password = 'original-test-password';
  let rejectToken = false;
  const requests = [];
  const fetch = async (input, options) => {
    const url = new URL(input);
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ path: url.pathname, method: options.method, query: url.searchParams, body });
    const json = (value, status = 200) => new Response(JSON.stringify(value), {
      status, headers: { 'Content-Type': 'application/json' },
    });
    if (url.pathname === '/auth/v1/recover') return json({});
    if (url.pathname === '/auth/v1/logout') return json({});
    if (url.pathname === '/auth/v1/token') {
      return body.email === user.email && body.password === password ? json(session) :
        json({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 400);
    }
    if (url.pathname === '/auth/v1/user') {
      if (rejectToken) return json({ code: 'bad_jwt', message: 'Invalid token' }, 401);
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      if (options.method === 'PUT') password = body.password;
      return json(user);
    }
    throw new Error(`Unexpected test request: ${options.method} ${url.pathname}`);
  };
  const open = (url) => {
    window.location = new URL(url);
    const client = createClient('http://auth.example.test', 'test-anon-key', {
      global: { fetch },
      auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: true, storage },
    });
    const recovery = createPasswordRecovery(client.auth, window);
    t.after(() => { recovery.dispose(); client.auth.stopAutoRefresh(); });
    return { client, recovery };
  };
  return { open, requests, rejectToken: () => { rejectToken = true; } };
}

test('email request → recovery link → reload → save → sign in with the new password', { timeout: 5000 }, async (t) => {
  const { open, requests } = fixture(t);
  const login = open('http://localhost/login');
  await login.recovery.initialized;
  assert.equal(login.recovery.getSnapshot(), null);
  const request = await login.client.auth.resetPasswordForEmail(user.email, { redirectTo: 'http://localhost/login' });
  assert.equal(request.error, null);
  const mailRequest = requests.find((entry) => entry.path.endsWith('/recover'));
  assert.equal(mailRequest.body.email, user.email);
  assert.equal(mailRequest.query.get('redirect_to'), 'http://localhost/login');

  const link = open(recoveryUrl);
  const recoveryEvent = new Promise((resolve) => link.client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') resolve();
  }));
  await link.recovery.initialized;
  await recoveryEvent;
  assert.equal(window.location.hash, '');
  assert.equal(link.recovery.getSnapshot().status, 'ready');
  assert.equal(link.recovery.getSnapshot().email, user.email);
  link.recovery.dispose();

  const reload = open(window.location.href);
  await reload.recovery.initialized;
  assert.equal(reload.recovery.getSnapshot().status, 'ready');
  assert.equal((await reload.recovery.updatePassword('replacement-test-password')).error, null);
  assert.equal(reload.recovery.getSnapshot().status, 'complete');
  const update = requests.find((entry) => entry.method === 'PUT');
  assert.equal(update.body.password, 'replacement-test-password');
  assert.equal(update.body.current_password, undefined);
  assert.equal(requests.filter((entry) => entry.path.endsWith('/token')).length, 0,
    'Recovery must not attempt to sign in using the forgotten password');

  assert.equal((await reload.client.auth.signOut({ scope: 'local' })).error, null);
  const oldLogin = await reload.client.auth.signInWithPassword({ email: user.email, password: 'original-test-password' });
  assert.ok(oldLogin.error);
  const newLogin = await reload.client.auth.signInWithPassword({ email: user.email, password: 'replacement-test-password' });
  assert.equal(newLogin.error, null);
  assert.equal(newLogin.data.user.id, user.id);
  reload.recovery.dismiss();
  assert.equal(reload.recovery.getSnapshot(), null);
});

test('an expired email callback displays an invalid-link state', { timeout: 5000 }, async (t) => {
  const { open, requests } = fixture(t);
  const { recovery } = open('http://localhost/login#error=access_denied&error_code=otp_expired&error_description=Email+link+has+expired');
  await recovery.initialized;
  assert.equal(recovery.getSnapshot().status, 'invalid');
  assert.equal(requests.filter((entry) => entry.method === 'PUT').length, 0);
});

test('a rejected recovery token cannot update a password', { timeout: 5000 }, async (t) => {
  const fixtureState = fixture(t);
  fixtureState.rejectToken();
  const { recovery } = fixtureState.open(recoveryUrl);
  await recovery.initialized;
  assert.equal(recovery.getSnapshot().status, 'invalid');
  assert.ok((await recovery.updatePassword('replacement-test-password')).error);
  assert.equal(fixtureState.requests.filter((entry) => entry.method === 'PUT').length, 0);
});
