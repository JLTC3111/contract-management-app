// /utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js'
import { createPasswordRecovery } from './passwordRecovery';
import { createAuthStorage, signOutClient } from './authSession';
import { fetchWithDeadline } from './network';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const authStorage = createAuthStorage(`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`);
// A reset email is an explicit sign-in, including after a previous local logout.
const callback = new URLSearchParams(globalThis.location?.hash?.slice(1));
if (callback.get('type') === 'recovery' && callback.get('access_token') && callback.get('refresh_token')) {
  authStorage.allowSignIn();
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithDeadline },
  auth: {
    storageKey: authStorage.key,
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const signOut = () => signOutClient(supabase.auth, authStorage);
export const beginSignIn = () => authStorage.allowSignIn();

export const passwordRecovery = createPasswordRecovery(supabase.auth);

if (import.meta.hot) {
  import.meta.hot.dispose(() => passwordRecovery.dispose());
}

// expose supabase globally for dev tools (optional in dev only)
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}
