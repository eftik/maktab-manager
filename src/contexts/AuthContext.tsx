import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type AdminRole = 'owner' | 'admin';

interface AdminInfo {
  role: AdminRole;
  schoolId: string | null;
  displayName: string;
}

interface AuthCtx {
  user: User | null;
  admin: AdminInfo | null;
  loading: boolean;
  isOwner: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const offlineSession = localStorage.getItem("offlineSession");
  const offlineAdmin = localStorage.getItem("offlineAdmin");

  const [user, setUser] = useState<User | null>(
    offlineSession ? JSON.parse(offlineSession).user : null
  );

  const [admin, setAdmin] = useState<AdminInfo | null>(
    offlineAdmin ? JSON.parse(offlineAdmin) : null
  );

  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchAdmin = useCallback(async (userId: string) => {
  try {
    const { data } = await supabase
      .from('admins')
      .select('role, school_id, display_name')
      .eq('user_id', userId)
      .single();

    if (data) {
      const adminData = {
        role: data.role,
        schoolId: data.school_id,
        displayName: data.display_name
      };

      setAdmin(adminData);

      // Save admin info for offline use
      localStorage.setItem("offlineAdmin", JSON.stringify(adminData));

    } else {
      setAdmin(null);
    }

  } catch {

    // OFFLINE fallback
    const cached = localStorage.getItem("offlineAdmin");

    if (cached) {
      setAdmin(JSON.parse(cached));
    } else {
      setAdmin(null);
    }

  }
}, []);

  useEffect(() => {

    const loadSession = async () => {

      try {
        const { data: { session } } = await supabase.auth.getSession();

        const u = session?.user ?? null;

        if (u) {
          setUser(u);
          await fetchAdmin(u.id);
          setLoading(false);
          initializedRef.current = true;
          return;
        }

      } catch {}

      const offlineSession = localStorage.getItem("offlineSession");
      const offlineAdmin = localStorage.getItem("offlineAdmin");

      if (offlineSession) {
        const session = JSON.parse(offlineSession);
        const u = session?.user ?? null;

        if (u) {
          setUser(u);

          if (offlineAdmin) {
            setAdmin(JSON.parse(offlineAdmin));
          }

          setLoading(false);
          initializedRef.current = true;
          return;
        }
      }

      // If nothing found at all
      setLoading(false);
      initializedRef.current = true;
    }
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initializedRef.current) return;

      const u = session?.user ?? null;

      setUser(u);

      if (u) {
        await fetchAdmin(u.id);
      } else {
        setAdmin(null);
      }
    });

    return () => subscription.unsubscribe();

  }, [fetchAdmin]);

  const signIn = async (email: string, password: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return error.message;

    if (data?.session) {
      const session = data.session;

      // Save session for offline login
      localStorage.setItem("offlineSession", JSON.stringify(session));

      const u = session.user;
      setUser(u);

      await fetchAdmin(u.id);
    }

    return null;

  } catch {

    // Offline fallback login
    const cachedSession = localStorage.getItem("offlineSession");
    const cachedAdmin = localStorage.getItem("offlineAdmin");

    if (cachedSession) {
      const session = JSON.parse(cachedSession);

      setUser(session.user);

      if (cachedAdmin) {
        setAdmin(JSON.parse(cachedAdmin));
      }

      return null;
    }

    return "No internet and no saved login.";
  }
};

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("offlineSession");
    setUser(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        loading,
        isOwner: admin?.role === 'owner',
        signIn,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth outside provider');
  return c;
};