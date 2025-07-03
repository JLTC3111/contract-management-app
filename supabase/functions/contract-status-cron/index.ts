// @ts-expect-error Deno global is available at runtime
import { serve } from 'https://deno.land/std/http/server.ts';
// @ts-expect-error Deno global is available at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';

serve(async (req: Request) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Replace with specific origin in prod
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  console.log("✅ Reached function – JWT is disabled");

  // ✅ Auth check: Bearer token in Authorization header
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  // @ts-expect-error Deno global is available at runtime
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!cronSecret) {
    console.error('Missing CRON_SECRET in environment');
    return new Response(JSON.stringify({ code: 500, message: 'Server misconfiguration' }), {
      status: 500,
      headers,
    });
  }

  if (!token || token !== cronSecret) {
    return new Response(JSON.stringify({ code: 401, message: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  // ✅ Supabase Client
  // @ts-expect-error Deno global is available at runtime
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // @ts-expect-error Deno global is available at runtime
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ code: 500, message: 'Missing Supabase config' }), {
      status: 500,
      headers,
    });
  }

  const client = createClient(supabaseUrl, supabaseKey);

  const { error } = await client.rpc('update_contract_expirations');
  if (error) {
    console.error('RPC error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }

  return new Response(JSON.stringify({ message: 'Success' }), {
    status: 200,
    headers,
  });
});
