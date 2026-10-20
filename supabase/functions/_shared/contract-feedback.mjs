const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = { bug: 'Bug', suggestion: 'Suggestion', other: 'Other' };
const reference = (row) => `FB-${String(row.reference).padStart(6, '0')}`;

export function feedbackEmail(row) {
  const ref = reference(row);
  return {
    to: 'support@icue.vn',
    replyTo: row.sender_email,
    subject: `[Contract feedback ${ref}] ${categories[row.category]}`,
    messageId: `<contract-feedback.${row.id}@icue.vn>`,
    text: [
      `Contract Manager feedback: ${ref}`, `Type: ${categories[row.category]}`,
      `From: ${row.sender_name || row.sender_email} <${row.sender_email}>`,
      `Page: ${row.page}`, `Submitted: ${row.created_at}`, '', row.message,
    ].join('\n'),
  };
}

export async function deliverFeedback(service, sendEmail, id = null) {
  const claimed = await service.rpc('claim_contract_feedback', { p_id: id });
  if (claimed.error) throw claimed.error;
  let sent = 0;
  for (const row of claimed.data || []) {
    let failure = null;
    try { await sendEmail(feedbackEmail(row)); }
    catch { failure = 'smtp_delivery_failed'; }
    const finished = await service.rpc('finish_contract_feedback_email', {
      p_id: row.id, p_claim_token: row.claim_token, p_error: failure,
    });
    if (finished.error) throw finished.error;
    if (!failure && finished.data) sent++;
  }
  return sent;
}

export function feedbackHandler({ createClient, env, sendEmail }) {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply({ message: 'Method not allowed' }, 405);
    try {
      const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') || '')?.[1];
      if (!token) return reply({ code: 'unauthorized' }, 401);
      const service = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), options);
      if (env('CONTRACT_CRON_SECRET') && token === env('CONTRACT_CRON_SECRET')) {
        const body = await req.json().catch(() => null);
        if (body?.action !== 'retry') return reply({ code: 'invalid_request' }, 400);
        return reply({ sent: await deliverFeedback(service, sendEmail) });
      }
      const { data: auth, error: authError } = await service.auth.getUser(token);
      if (authError || !auth?.user?.email || auth.user.is_anonymous) return reply({ code: 'unauthorized' }, 401);
      const profile = await service.from('users').select('role,full_name').eq('id', auth.user.id).maybeSingle();
      if (profile.error || !['admin', 'editor', 'approver', 'viewer'].includes(profile.data?.role)) {
        return reply({ code: 'forbidden' }, 403);
      }
      const raw = await req.text();
      if (raw.length > 24000) return reply({ code: 'invalid_request' }, 400);
      let body;
      try { body = JSON.parse(raw); } catch { return reply({ code: 'invalid_request' }, 400); }
      if (!body || !uuid.test(body.id) || !Object.hasOwn(categories, body.category)
        || typeof body.message !== 'string' || !body.message.trim() || body.message.trim().length > 5000
        || typeof body.page !== 'string' || !/^\/(?!\/)[^?#\r\n\0]*$/.test(body.page) || body.page.length > 256
        || /[\r\n]/.test(auth.user.email)) {
        return reply({ code: 'invalid_request' }, 400);
      }
      const saved = await service.rpc('save_contract_feedback', {
        p_id: body.id, p_user_id: auth.user.id, p_email: auth.user.email,
        p_name: profile.data.full_name || '', p_category: body.category,
        p_message: body.message.trim(), p_page: body.page,
      });
      if (saved.error) {
        if (saved.error.message?.includes('FEEDBACK_RATE_LIMIT')) return reply({ code: 'rate_limited' }, 429);
        if (saved.error.message?.includes('FEEDBACK_CONFLICT')) return reply({ code: 'conflict' }, 409);
        throw saved.error;
      }
      const row = saved.data?.[0];
      if (!row) throw new Error('Missing feedback receipt');
      // Saving is the success boundary. Delivery problems leave durable work
      // for the scheduler and never turn a saved submission into a form error.
      try { await deliverFeedback(service, sendEmail, row.id); } catch { /* retry the lease after expiry */ }
      return reply({ id: row.id, reference: reference(row), saved: true });
    } catch {
      return reply({ code: 'unavailable' }, 503);
    }
  };
}
