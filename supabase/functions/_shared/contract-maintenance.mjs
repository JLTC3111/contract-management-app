const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

async function authorize(req, { createClient, env }, allowCron) {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') || '')?.[1];
  if (!token) throw new HttpError(401, 'Authentication required');
  const url = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) throw new HttpError(500, 'Missing server configuration');
  const service = createClient(url, serviceKey, clientOptions);
  if (allowCron && env('CONTRACT_CRON_SECRET') && token === env('CONTRACT_CRON_SECRET')) return { service };
  const caller = createClient(url, anonKey, {
    ...clientOptions, global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await caller.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Invalid session');
  // Use the stored role, never caller-editable JWT user metadata.
  const profile = await service.from('users').select('role').eq('id', data.user.id).single();
  if (profile.error || !['admin', 'editor'].includes(profile.data?.role)) {
    throw new HttpError(403, 'Contract editing permission required');
  }
  return { service, caller };
}

/** Snapshot all pages before deleting, so offsets cannot skip removed rows. */
export async function removeContractFolder(storage, prefix) {
  const paths = [];
  const folders = [prefix];
  while (folders.length) {
    const folder = folders.pop();
    let offset = 0;
    while (true) {
      const { data, error } = await storage.list(folder, {
        limit: 100, offset, sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      if (!data?.length) break;
      for (const entry of data) {
        const path = `${folder}/${entry.name}`;
        if (entry.id == null && entry.metadata == null) folders.push(path);
        else paths.push(path);
      }
      offset += data.length;
    }
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await storage.remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
  const { data, error } = await storage.list(prefix, { limit: 1 });
  if (error) throw error;
  if (data?.length) throw new Error('Document cleanup is incomplete');
}

export async function cleanupContractDocuments(service, contractId = null) {
  const { data: jobs, error } = await service.rpc('claim_contract_storage_cleanup', { p_contract_id: contractId });
  if (error) throw error;
  let cleaned = 0;
  let pending = 0;
  for (const job of jobs || []) {
    try {
      // A reused identity must never cause deletion of a new record's files.
      const existing = await service.from('contracts').select('id').eq('id', job.contract_id).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) throw new Error('Contract identity is still in use');
      await removeContractFolder(service.storage.from('contracts'), `uploads/${job.contract_id}`);
      const finished = await service.rpc('finish_contract_storage_cleanup', { p_contract_id: job.contract_id });
      if (finished.error) throw finished.error;
      cleaned++;
    } catch (failure) {
      pending++;
      const failed = await service.rpc('finish_contract_storage_cleanup', {
        p_contract_id: job.contract_id, p_error: failure.message || 'Document cleanup failed',
      });
      if (failed.error) throw failed.error;
    }
  }
  return { cleaned, pending };
}

export function maintenanceHandler(dependencies) {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply({ message: 'Method not allowed' }, 405);
    try {
      const { service } = await authorize(req, dependencies, true);
      const { data, error } = await service.rpc('update_contract_expirations');
      if (error) throw error;
      const cleanup = await cleanupContractDocuments(service);
      return reply({ ...(data?.[0] || {}), documents_cleaned: cleanup.cleaned, cleanup_pending: cleanup.pending });
    } catch (error) {
      return reply({ message: error.status ? error.message : 'Contract maintenance failed' }, error.status || 500);
    }
  };
}

export function deleteContractHandler(dependencies) {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply({ message: 'Method not allowed' }, 405);
    let deleted = false;
    try {
      const { service, caller } = await authorize(req, dependencies, false);
      let body;
      try { body = await req.json(); } catch { throw new HttpError(400, 'Invalid request'); }
      const id = Number(body.contract_id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new HttpError(400, 'Invalid contract ID');
      let query = caller.from('contracts').delete().eq('id', id);
      if (body.expected_revision != null) {
        if (!Number.isSafeInteger(body.expected_revision) || body.expected_revision < 0) {
          throw new HttpError(400, 'Invalid contract revision');
        }
        query = query.eq('revision', body.expected_revision);
      }
      // The caller's JWT authorizes deletion. Service access only cleans the
      // durable jobs queued by a successful, RLS-authorized deletion.
      const result = await query.select('id').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new HttpError(409, 'Contract changed or is unavailable. Reload before deleting.');
      deleted = true;
      const cleanup = await cleanupContractDocuments(service, id);
      return reply({ deleted: true, cleanup_pending: cleanup.cleaned !== 1 });
    } catch (error) {
      if (deleted) return reply({ deleted: true, cleanup_pending: true });
      return reply({ message: error.status ? error.message : 'Could not delete contract' }, error.status || 500);
    }
  };
}
