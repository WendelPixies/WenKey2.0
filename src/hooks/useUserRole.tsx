import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'manager' | 'user';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole('user');
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('permission_type')
        .eq('id', user.id)
        .single();

      if (!error && data?.permission_type) {
        setRole(data.permission_type as UserRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isUser: role === 'user',
  };
}
