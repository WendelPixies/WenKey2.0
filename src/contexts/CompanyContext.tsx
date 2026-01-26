import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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