import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const navigate = useNavigate();

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      // Tentamos buscar as colunas que temos certeza que existem
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, company_id, avatar_url')
        .eq('id', userId)
        .maybeSingle(); // Usamos maybeSingle para evitar erro se não houver perfil

      if (error) {
        console.error('Error fetching profile:', error);

        // Retry logic for network errors or temporary glitches
        if (retryCount < 3) {
          console.log(`Retrying profile fetch (${retryCount + 1}/3)...`);
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000 * (retryCount + 1));
          return;
        }

        setProfile(null);
        return;
      }

      if (data) {
        // Buscamos o permission_type separadamente ou assumimos 'user' se falhar
        // Isso evita que o erro de coluna inexistente quebre o carregamento principal
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
        console.log(`Retrying profile fetch after unexpected error (${retryCount + 1}/3)...`);
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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('🔐 Starting auth initialization...');

      // Safety timeout to prevent infinite loading
      // Increased to 30s to account for tab switching delays
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('⏱️ Auth initialization timed out - forcing loading to false');
          console.warn('This usually means getSession() is taking too long or variables are missing');
          setLoading(false);
        }
      }, 30000);

      try {
        // Log environment check (without exposing sensitive data)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const hasKey = !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        console.log('📍 Supabase URL configured:', !!supabaseUrl);
        console.log('🔑 Supabase Key configured:', hasKey);

        if (!supabaseUrl || !hasKey) {
          console.error('❌ CRITICAL: Supabase environment variables are missing!');
          console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set');
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        console.log('🔄 Calling supabase.auth.getSession()...');
        const startTime = Date.now();

        // Get limits from local storage if available to avoid loading state flicker
        const { data: { session }, error } = await supabase.auth.getSession();

        const duration = Date.now() - startTime;
        console.log(`✅ getSession() completed in ${duration}ms`);

        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ Error initializing auth session:', error);
          console.error('Error details:', { message: error.message, status: error.status });
          // Don't sign out immediately on error, retry logic could be added here
          // But for now we just handle the lack of session
        }

        if (!mounted) {
          console.log('⚠️ Component unmounted, skipping state updates');
          return;
        }

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          console.log('👤 User found, fetching profile...');
          await fetchProfile(currentUser.id);
        } else {
          console.log('👤 No user session found');
        }
      } catch (error) {
        console.error('💥 Unexpected error during auth initialization:', error);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          console.log('✅ Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);

        // If we are signing out, we handle it in the signOut function to ensure clean redirect
        // But we update state here to keep it in sync
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }

        setLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password');
        }
      }
    );

    // Set up periodic session refresh to keep user logged in
    // This prevents automatic logout due to token expiration
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Refresh the session if it exists
        await supabase.auth.refreshSession();
        console.log('Session refreshed automatically');
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [navigate]);

  const signOut = async () => {
    try {
      // Attempt to sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always cleanup and redirect
      setProfile(null);
      setSession(null);
      setUser(null);

      // Clear all app specific keys
      localStorage.removeItem('selectedCompanyId');
      localStorage.removeItem('selectedCompany');

      // Clear session storage to reset admin session marker
      sessionStorage.clear();

      // Force navigation to auth
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
