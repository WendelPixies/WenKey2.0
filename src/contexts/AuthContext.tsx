import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  permission_type: 'user' | 'manager' | 'admin';
  company_id: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  const navigate = useNavigate();

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, company_id, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        setProfile(null);
        return;
      }

      if (data) {
        const { data: roleData } = await supabase
          .from('profiles')
          .select('permission_type' as any)
          .eq('id', userId)
          .maybeSingle();

        let avatar_url = data.avatar_url;
        if (avatar_url && !avatar_url.startsWith('http')) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
          avatar_url = urlData.publicUrl;
        }

        setProfile({
          ...data,
          avatar_url,
          permission_type: (roleData as any)?.permission_type || 'user'
        } as Profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      if (retryCount < 3) {
        setTimeout(() => fetchProfile(userId, retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const updateLoading = (isLoading: boolean) => {
    loadingRef.current = isLoading;
    setLoading(isLoading);
  };

  useEffect(() => {
    let mounted = true;
    let abortAutoRefresh: (() => void) | null = null;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      const currentUser = nextSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    };

    const ensureFreshSession = async (reason: string) => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error(`[Auth] getSession error (${reason}):`, error);
        }

        if (!session) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error(`[Auth] refreshSession error (${reason}):`, refreshError);
          }
          await applySession(refreshData?.session ?? null);
        } else {
          await applySession(session);
        }
      } catch (err) {
        console.error(`[Auth] ensureFreshSession unexpected (${reason}):`, err);
      }
    };

    const syncSession = async (reason: string) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const hasKey = !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !hasKey) {
        console.error('CRITICAL: Supabase environment variables are missing!');
        if (mounted) updateLoading(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error(`[Auth] getSession error (${reason}):`, error);
        }

        await applySession(session);
      } catch (error) {
        console.error(`[Auth] Unexpected error during session sync (${reason}):`, error);
      } finally {
        if (mounted && loadingRef.current) {
          updateLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      const timeoutId = setTimeout(() => {
        if (mounted && loadingRef.current) {
          console.warn('[Auth] Initialization timed out - forcing loading to false');
          updateLoading(false);
        }
      }, 30000);

      try {
        await syncSession('initialize');
      } finally {
        clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);

        await applySession(nextSession);
        updateLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password');
        }
      }
    );

    // Start automatic token refresh to avoid stale sessions when tab fica inativa
    try {
      const { data: autoRefresh } = supabase.auth.startAutoRefresh();
      abortAutoRefresh = () => {
        autoRefresh?.subscription?.unsubscribe?.();
      };
    } catch (err) {
      console.warn('[Auth] startAutoRefresh not available or failed:', err);
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensureFreshSession('visibilitychange');
      }
    };

    const handleFocus = () => {
      ensureFreshSession('window-focus');
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
        console.log('Session refreshed automatically');
      }
    }, 30 * 60 * 1000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      abortAutoRefresh?.();
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [navigate]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setProfile(null);
      setSession(null);
      setUser(null);

      localStorage.removeItem('selectedCompanyId');
      localStorage.removeItem('selectedCompany');
      sessionStorage.clear();

      navigate('/auth', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
