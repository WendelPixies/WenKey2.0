import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CompanyContextType {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => {
    return localStorage.getItem('selectedCompanyId');
  });

  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem('selectedCompanyId', selectedCompanyId);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  }, [selectedCompanyId]);

  return (
    <CompanyContext.Provider value={{ selectedCompanyId, setSelectedCompanyId }}>
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