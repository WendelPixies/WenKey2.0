import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Company {
  id: string;
  name: string;
  is_active?: boolean;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  selectedCompanyId: string | null;
  setSelectedCompany: (company: Company | null) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    try {
      const saved = localStorage.getItem('selectedCompany');
      if (saved) {
        return JSON.parse(saved);
      }

      // Fallback for migration from ID-only storage
      const legacyId = localStorage.getItem('selectedCompanyId');
      if (legacyId) {
        return { id: legacyId, name: 'Carregando...' };
      }
    } catch (e) {
      console.error('Error parsing selectedCompany from localStorage', e);
    }
    return null;
  });
  const autoSelectLock = useRef<{ userId: string | null; applied: boolean }>({
    userId: null,
    applied: false,
  });

  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));
      // Keep legacy ID for compatibility
      localStorage.setItem('selectedCompanyId', selectedCompany.id);
    }
    // We strictly DO NOT clear localStorage here if selectedCompany is null,
    // to prevent accidental data loss during state transitions or mounting.
    // Clearing storage is handled explicitly by the signOut function in AuthContext.
  }, [selectedCompany]);

  // Auto-select the company the user is registered to (default) once per user session
  useEffect(() => {
    const userId = profile?.id ?? null;
    const targetCompanyId = profile?.company_id ?? null;

    // Reset guard when user changes
    if (autoSelectLock.current.userId !== userId) {
      autoSelectLock.current = { userId, applied: false };
    }

    if (!userId || !targetCompanyId) return;

    const alreadySelected = selectedCompany?.id === targetCompanyId;
    if (alreadySelected || autoSelectLock.current.applied) return;

    const fetchAndSelect = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, is_active')
          .eq('id', targetCompanyId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSelectedCompany({
            id: data.id,
            name: data.name,
            is_active: data.is_active,
          });
        }
      } catch (err) {
        console.error('Error auto-selecting company for user:', err);
      } finally {
        autoSelectLock.current.applied = true;
      }
    };

    fetchAndSelect();
  }, [profile?.id, profile?.company_id, selectedCompany]);

  return (
    <CompanyContext.Provider value={{
      selectedCompany,
      selectedCompanyId: selectedCompany?.id || null,
      setSelectedCompany
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
