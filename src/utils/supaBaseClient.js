// /utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js'
import { createPasswordRecovery } from './passwordRecovery';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const passwordRecovery = createPasswordRecovery(supabase.auth);

if (import.meta.hot) {
  import.meta.hot.dispose(() => passwordRecovery.dispose());
}

// expose supabase globally for dev tools (optional in dev only)
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}
