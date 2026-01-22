import { useEffect, useState } from 'react';
import { useCompany, Company } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { toTitleCase } from '@/lib/utils';

export function CompanySelector() {
  const { selectedCompany, setSelectedCompany } = useCompany();
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || roleLoading) return;

    let mounted = true;
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        let companyList: Company[] = [];

        if (role === 'admin') {
          const { data, error } = await supabase
            .from('companies')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

          if (error) throw error;
          companyList = data || [];
        } else {
          const { data, error } = await supabase
            .from('company_members')
            .select('company_id, companies(id, name, is_active)')
            .eq('user_id', user.id);

          if (error) throw error;

          companyList = data
            .map((item: any) => item.companies)
            .filter((c: any) => c && c.is_active) as Company[];

          companyList.sort((a, b) => a.name.localeCompare(b.name));
        }

        if (mounted) {
          setCompanies(companyList);

          // Logic to validate/update selection
          if (companyList.length > 0) {
            // Check if current selection is valid
            const currentInList = selectedCompany
              ? companyList.find(c => c.id === selectedCompany.id)
              : null;

            if (currentInList) {
              // Update name if needed (or if it was "Carregando...")
              if (currentInList.name !== selectedCompany?.name) {
                setSelectedCompany(currentInList);
              }
            } else {
              // If no selection, or selection not valid (e.g. inactive), select first
              if (!selectedCompany) {
                setSelectedCompany(companyList[0]);
              } else {
                // The current selection is NOT in the active list.
                // Ideally we reset, but IF the user sees "unloading", it's because this runs.
                // We should only reset if we are sure it's invalid.
                // If role is admin, list contains ALL active companies.
                // So if it's not in list, it's invalid/inactive.
                setSelectedCompany(companyList[0]);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCompanies();
    return () => { mounted = false; };
  }, [user, role, roleLoading]); // Remove selectedCompany from dependency to avoid loop

  const isAdmin = role === 'admin';
  const showSelector = isAdmin;

  // Only show loading state if we DON'T have a selected company to show
  if ((loading || roleLoading) && !selectedCompany) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-sidebar-accent">
        <Building2 className="w-4 h-4 text-sidebar-foreground/60" />
        <span className="text-sm text-sidebar-foreground/60">
          {toTitleCase('Carregando...')}
        </span>
      </div>
    );
  }

  if (!showSelector) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent border border-sidebar-border text-sidebar-foreground">
        <Building2 className="w-4 h-4 text-sidebar-foreground/80" />
        <div className="flex flex-col">
          <span className="text-xs text-sidebar-foreground/60">{toTitleCase('Empresa atual')}</span>
          <span className="text-sm font-semibold">
            {selectedCompany?.name ? toTitleCase(selectedCompany.name) : toTitleCase('Nenhuma empresa vinculada')}
          </span>
        </div>
      </div>
    );
  }

  if (companies.length === 0 && !loading && isAdmin) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-sidebar-accent">
        <Building2 className="w-4 h-4 text-sidebar-foreground/60" />
        <span className="text-sm text-sidebar-foreground/60">
          {toTitleCase('Nenhuma empresa')}
        </span>
      </div>
    );
  }

  return (
    <Select
      value={selectedCompany?.id}
      onValueChange={(value) => {
        const company = companies.find(c => c.id === value);
        if (company) setSelectedCompany(company);
      }}
    >
      <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <SelectValue asChild>
            <span>{selectedCompany ? toTitleCase(selectedCompany.name) : toTitleCase('Selecione...')}</span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {toTitleCase(company.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
