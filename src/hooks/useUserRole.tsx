import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Update type definition if needed, or just let valid string literals allow null via state type
export type UserRole = 'admin' | 'manager' | 'user' | null;

export function useUserRole() {
  const { user, profile: authProfile } = useAuth();
  const [role, setRole] = useState<UserRole>(null); // Start with null to prevent premature defaults
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!user) {
      setRole('user'); // Default to 'user' to unblock UI if auth state is messy
      setLoading(false);
      return;
    }

    // Prioritize role from AuthContext if available
    if (authProfile?.permission_type) {
      setRole(authProfile.permission_type as UserRole);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      // Safety timeout
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('useUserRole: fetchRole timed out');
          setRole(prev => prev || 'user'); // Fallback to user if timed out
          setLoading(false);
        }
      }, 3000);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('permission_type' as any)
          .eq('id', user.id)
          .maybeSingle();

        if (mounted) {
          const profileData = data as any;
          if (!error && profileData?.permission_type) {
            setRole(profileData.permission_type as UserRole);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching role:', err);
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    fetchRole();

    return () => {
      mounted = false;
    };
  }, [user, authProfile]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isUser: role === 'user',
  };
}
