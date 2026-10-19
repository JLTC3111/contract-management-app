import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';
import { deleteContractHandler } from '../_shared/contract-maintenance.mjs';

// Authentication and stored-role checks are performed by the shared handler.
Deno.serve(deleteContractHandler({ createClient, env: (name: string) => Deno.env.get(name) }));
