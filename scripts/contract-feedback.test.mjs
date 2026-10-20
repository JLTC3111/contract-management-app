import assert from 'node:assert/strict';
import test from 'node:test';
import { feedbackHandler, deliverFeedback, feedbackEmail } from '../supabase/functions/_shared/contract-feedback.mjs';
import { harness, button, nodes, textOf } from './helpers/componentHarness.mjs';

const id = '12345678-1234-4234-8234-123456789abc';
const input = { id, category: 'bug', message: 'The filter does not update.', page: '/' };
const row = { ...input, reference: 12, sender_email: 'person@example.test', sender_name: 'Person',
  created_at: '2026-10-20T00:00:00Z', claim_token: 'claim-one' };
const request = (body = input, token = 'valid-session', method = 'POST') => new Request('https://example.test/feedback', {
  method, headers: token ? { Authorization: `Bearer ${token}` } : {},
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});

function setup({ role = 'viewer', valid = true, emailFails = false, saveError = null, finishError = false } = {}) {
  const calls = [];
  const emails = [];
  const service = {
    auth: { async getUser(token) { return valid && token === 'valid-session'
      ? { data: { user: { id: 'user-one', email: row.sender_email } } } : { error: new Error('Invalid token') }; } },
    from() { return { select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: { role, full_name: 'Person' } }; } }; },
    async rpc(name, body) {
      calls.push({ name, body });
      if (name === 'save_contract_feedback') return saveError ? { error: { message: saveError } } : { data: [row] };
      if (name === 'claim_contract_feedback') return { data: [row] };
      if (name === 'finish_contract_feedback_email') return finishError ? { error: new Error('Database unavailable') } : { data: true };
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  return { calls, emails, service,
    createClient: () => service,
    env: (name) => ({ SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key', CONTRACT_CRON_SECRET: 'retry-secret' })[name],
    sendEmail: async (email) => { emails.push(email); if (emailFails) throw new Error('Private SMTP diagnostic'); },
  };
}

test('feedback preflight and non-POST requests never write or send mail', async () => {
  const dep = setup();
  const handler = feedbackHandler(dep);
  assert.equal((await handler(request(null, null, 'OPTIONS'))).status, 204);
  assert.equal((await handler(request(null, null, 'GET'))).status, 405);
  assert.equal(dep.calls.length, 0);
});

for (const [label, token, settings, status] of [
  ['missing authentication', null, {}, 401], ['anonymous API key', 'anon-key', {}, 401],
  ['expired authentication', 'valid-session', { valid: false }, 401],
  ['another application account', 'valid-session', { role: 'staff' }, 403],
]) {
  test(`feedback rejects ${label} before privileged writes`, async () => {
    const dep = setup(settings);
    assert.equal((await feedbackHandler(dep)(request(input, token))).status, status);
    assert.equal(dep.calls.length, 0);
    assert.equal(dep.emails.length, 0);
  });
}

test('feedback takes identity from Auth, ignores forged recipients and saves before emailing', async () => {
  const dep = setup();
  const result = await feedbackHandler(dep)(request({ ...input, email: 'attacker@example.test', to: 'attacker@example.test' }));
  assert.deepEqual(await result.json(), { saved: true, id, reference: 'FB-000012' });
  assert.equal(dep.calls[0].name, 'save_contract_feedback');
  assert.equal(dep.calls[0].body.p_email, row.sender_email);
  assert.equal(dep.calls[0].body.p_user_id, 'user-one');
  assert.equal(dep.emails[0].to, 'support@icue.vn');
  assert.equal(dep.emails[0].replyTo, row.sender_email);
  assert.match(dep.emails[0].text, /The filter does not update/);
  assert.equal(dep.calls.at(-1).body.p_error, null);
});

test('SMTP failure still returns a saved receipt and queues retry without exposing diagnostics', async () => {
  const dep = setup({ emailFails: true });
  const result = await feedbackHandler(dep)(request());
  assert.equal(result.status, 200);
  assert.equal((await result.json()).saved, true);
  assert.equal(dep.calls.at(-1).body.p_error, 'smtp_delivery_failed');
});

test('a delivery bookkeeping outage cannot turn a saved submission into a form failure', async () => {
  const dep = setup({ finishError: true });
  const result = await feedbackHandler(dep)(request());
  assert.equal(result.status, 200);
  assert.equal((await result.json()).saved, true);
});

for (const payload of [null, { ...input, message: '   ' }, { ...input, message: 'x'.repeat(5001) },
  { ...input, category: '__proto__' }, { ...input, id: 'bad-id' }, { ...input, page: '//other.example' },
  { ...input, page: '/?token=private' }, { ...input, page: '/#private' }]) {
  test(`malformed feedback is rejected: ${JSON.stringify(payload)?.slice(0, 90)}`, async () => {
    const dep = setup();
    assert.equal((await feedbackHandler(dep)(request(payload))).status, 400);
    assert.equal(dep.calls.length, 0);
  });
}

for (const [error, status, code] of [['FEEDBACK_RATE_LIMIT', 429, 'rate_limited'], ['FEEDBACK_CONFLICT', 409, 'conflict'], ['private database diagnostic', 503, 'unavailable']]) {
  test(`storage failure ${code} never sends email`, async () => {
    const dep = setup({ saveError: error });
    const result = await feedbackHandler(dep)(request());
    assert.equal(result.status, status);
    assert.deepEqual(await result.json(), { code });
    assert.equal(dep.emails.length, 0);
  });
}

test('only the server retry token may process the queue without a user session', async () => {
  const dep = setup({ valid: false });
  const handler = feedbackHandler(dep);
  assert.equal((await handler(request(input, 'retry-secret'))).status, 400);
  const result = await handler(request({ action: 'retry' }, 'retry-secret'));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).sent, 1);
  assert.equal(dep.calls[0].body.p_id, null);
  assert.equal(dep.calls.some((call) => call.name === 'save_contract_feedback'), false);
});

test('a queue claim held by another worker sends no duplicate email', async () => {
  let emails = 0;
  assert.equal(await deliverFeedback({ rpc: async () => ({ data: [] }) }, async () => { emails++; }), 0);
  assert.equal(emails, 0);
  assert.equal(feedbackEmail(row).messageId, feedbackEmail(row).messageId);
});

const dialogApp = ({ seed = [], invoke } = {}) => harness({ seed, user: { email: 'person@example.test' },
  supabase: { functions: { invoke } }, globals: { window: { location: { pathname: '/' } } } });

test('feedback double click submits once and success displays the server receipt', async () => {
  let calls = 0;
  let finish;
  const app = dialogApp({ seed: ['bug', 'A useful message'], invoke: () => {
    calls++;
    return new Promise((resolve) => { finish = resolve; });
  } });
  const Dialog = app.load('src/components/FeedbackDialog.jsx').default;
  const props = { onClose() {} };
  const form = nodes(app.render(Dialog, props)).find((node) => node.type === 'form');
  const first = form.props.onSubmit({ preventDefault() {} });
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls, 1);
  finish({ data: { saved: true, reference: 'FB-000012' } });
  await first;
  assert.match(textOf(app.render(Dialog, props)), /FB-000012/);
  assert.equal(button(app.render(Dialog, props), 'Submit feedback'), undefined);
});

test('a failed submission preserves the draft and reuses the submission ID when retried', async () => {
  const ids = [];
  const app = dialogApp({ seed: ['bug', 'Keep this message'], invoke: async (_name, { body }) => {
    ids.push(body.id);
    return { error: new Error('Connection lost') };
  } });
  const Dialog = app.load('src/components/FeedbackDialog.jsx').default;
  const props = { onClose() {} };
  const submit = async () => nodes(app.render(Dialog, props)).find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await submit();
  assert.equal(app.state[1], 'Keep this message');
  assert.match(textOf(app.render(Dialog, props)), /Could not submit feedback/);
  await submit();
  assert.equal(ids[0], ids[1]);
  assert.equal(ids.length, 2);
});

test('email fallback percent-encodes messages and retains the current draft', () => {
  const app = dialogApp();
  const { feedbackMailto } = app.load('src/api/feedback.js');
  const url = feedbackMailto('bug', 'Details & more\nXin chào', '/contracts/1');
  assert.match(url, /^mailto:support@icue.vn\?/);
  assert.match(decodeURIComponent(url), /Details & more\nXin chào/);
  assert.equal(url.includes('Details &'), false);
});
