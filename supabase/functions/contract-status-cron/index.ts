import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';
import { maintenanceHandler } from '../_shared/contract-maintenance.mjs';

// Custom authentication accepts a verified editor/admin session or the rotated,
// server-only scheduler credential. The gateway allows that non-JWT secret.
Deno.serve(maintenanceHandler({ createClient, env: (name: string) => Deno.env.get(name) }));
