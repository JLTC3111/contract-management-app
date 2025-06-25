import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supaBaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); // This will be your custom user object
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
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
        setUser(null);
      } else {
        setUser(customUser); // Now `user.role` will exist
      }
    } else {
      setUser(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser(); // Refresh user on auth change
      } else {
        setUser(null);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
