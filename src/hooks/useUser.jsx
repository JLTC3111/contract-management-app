import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { MOCK_USER } from '../data/mockData';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('isDemoMode') === 'true';
  });

  // Demo mode functions
  const enableDemoMode = () => {
    localStorage.setItem('isDemoMode', 'true');
    setIsDemoMode(true);
    setUser(MOCK_USER);
    setLoading(false);
  };

  const disableDemoMode = async () => {
    localStorage.removeItem('isDemoMode');
    setIsDemoMode(false);
    setUser(null);
    // After exiting demo, try to fetch real user if logged in
    await fetchUser();
  };

  const fetchUser = async () => {
    // If in demo mode, use mock user
    if (localStorage.getItem('isDemoMode') === 'true') {
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError.message);
        setUser(null);
        setLoading(false);
        return;
      }

      const authUser = session?.user;

      if (authUser) {
        // Now fetch the custom user from your own `users` table
        const { data: customUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userError) {
          console.error('Error fetching custom user:', userError.message);
          // If it's a 403 or auth error, the session might be invalid
          if (userError.message.includes('JWT') || userError.message.includes('expired') || userError.message.includes('403')) {
            console.log('Session appears invalid, signing out...');
            await supabase.auth.signOut();
          }
          setUser(null);
        } else {
          setUser(customUser); // Now `user.role` will exist
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Unexpected error in fetchUser:', error);
      setUser(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, 'Session:', !!session);
      if (session?.user) {
        fetchUser(); // Refresh user on auth change
      } else {
        console.log('Session cleared, setting user to null');
        setUser(null);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    // If in demo mode, just exit demo
    if (isDemoMode) {
      await disableDemoMode();
      return;
    }

    try {
      console.log('Starting logout process...');
      
      // Clear any local storage that might contain stale auth data
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-auth-token');
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error && error.message !== 'Auth session missing!') {
        console.error('Error during logout:', error);
      } else {
        console.log('Supabase signOut completed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear user state regardless of signOut success
      console.log('Clearing user state');
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, isDemoMode, enableDemoMode, disableDemoMode }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
