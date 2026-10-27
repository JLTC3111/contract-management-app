import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authStorage, signOut, supabase } from '../utils/supaBaseClient';
import { browserStorage } from '../utils/browserStorage';
import { isRetryableError, setSessionVerified, withDeadline } from '../utils/network';
import { useRevalidate } from './useRevalidate';
import { MOCK_USER } from '../data/mockData';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(() => browserStorage.getItem('isDemoMode') === 'true');
  const currentUser = useRef(null);
  const generation = useRef(0);
  const signedOut = useRef(false);

  const applyUser = useCallback((next) => {
    currentUser.current = next;
    setUser(next);
    setSessionVerified(!!next && !next.recoveryPending);
  }, []);

  const clearUser = useCallback(() => {
    generation.current += 1;
    signedOut.current = true;
    applyUser(null);
    setSessionError(null);
    setLoading(false);
  }, [applyUser]);

  const fetchUser = useCallback(async (suppliedSession) => {
    if (browserStorage.getItem('isDemoMode') === 'true') {
      applyUser(MOCK_USER);
      setLoading(false);
      return;
    }
    if (authStorage.isSignedOut() || signedOut.current) return;
    const request = ++generation.current;
    try {
      const result = suppliedSession
        ? { data: { session: suppliedSession } }
        : await withDeadline(supabase.auth.getSession());
      if (request !== generation.current) return;
      if (result.error) throw result.error;
      const session = result.data.session;
      if (!session?.user) { applyUser(null); setSessionError(null); return; }
      if (currentUser.current && currentUser.current.id !== session.user.id) applyUser(null);
      const { data: profile, error, status } = await withDeadline(supabase.from('users')
        .select('*').eq('id', session.user.id).single());
      if (request !== generation.current || authStorage.isSignedOut()) return;
      if (error) throw Object.assign(error, { status: error.status || status });
      applyUser(profile);
      setSessionError(null);
    } catch (error) {
      if (request !== generation.current || signedOut.current || authStorage.isSignedOut()) return;
      if (isRetryableError(error) && currentUser.current) {
        // Retain the page and its drafts, while all writes await revalidation.
        applyUser({ ...currentUser.current, recoveryPending: true });
      } else {
        applyUser(null);
      }
      setSessionError(error);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [applyUser]);

  useRevalidate(fetchUser);
  useEffect(() => {
    signedOut.current = authStorage.isSignedOut();
    if (signedOut.current) setLoading(false);
    else fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (browserStorage.getItem('isDemoMode') !== 'true') clearUser();
        return;
      }
      if (authStorage.isSignedOut()) return;
      signedOut.current = false;
      const request = ++generation.current;
      // Auth callbacks run under the SDK lock. Leave it before reading profiles.
      setTimeout(() => { if (request === generation.current) fetchUser(session); }, 0);
    });
    const onStorage = (event) => {
      if (event.key === authStorage.logoutKey && authStorage.isSignedOut()) clearUser();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      generation.current += 1;
      listener?.subscription?.unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, [clearUser, fetchUser]);

  const enableDemoMode = () => {
    browserStorage.setItem('isDemoMode', 'true');
    setIsDemoMode(true);
    applyUser(MOCK_USER);
    setLoading(false);
  };
  const disableDemoMode = async () => {
    browserStorage.removeItem('isDemoMode');
    setIsDemoMode(false);
    clearUser();
    signedOut.current = authStorage.isSignedOut();
    if (!signedOut.current) await fetchUser();
  };
  const logout = async () => {
    if (isDemoMode) return disableDemoMode();
    clearUser();
    return signOut();
  };

  return (
    <UserContext.Provider value={{ user, loading, sessionError, retrySession: () => fetchUser(), logout, isDemoMode, enableDemoMode, disableDemoMode }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
