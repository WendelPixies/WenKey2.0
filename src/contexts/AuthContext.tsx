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

  const fetchProfile = async (userId: string) => {
    try {
      // Tentamos buscar as colunas que temos certeza que existem
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, company_id, avatar_url')
        .eq('id', userId)
        .maybeSingle(); // Usamos maybeSingle para evitar erro se não houver perfil

      if (error) {
        console.error('Error fetching profile:', error);
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
      // Safety timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Auth initialization timed out - forcing loading to false');
          setLoading(false);
        }
      }, 3000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (!mounted) return;

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always cleanup and redirect
      setProfile(null);
      setSession(null);
      setUser(null);
      localStorage.removeItem('selectedCompanyId');
      localStorage.removeItem('selectedCompany');
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
