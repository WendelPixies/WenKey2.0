import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { toTitleCase } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
}

export function CompanySelector() {
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
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

          // Only auto-select if we absolutely don't have a valid selection
          const currentId = localStorage.getItem('selectedCompanyId');
          const hasCurrentValid = companyList.some(c => c.id === currentId);

          if (!currentId || !hasCurrentValid) {
            if (companyList.length > 0) {
              setSelectedCompanyId(companyList[0].id);
            }
          } else if (currentId && !selectedCompanyId) {
            // Restore from localStorage if context is empty
            setSelectedCompanyId(currentId);
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
  }, [user, role, roleLoading]); // Removed setSelectedCompanyId to avoid unnecessary re-runs

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const isAdmin = role === 'admin';
  const showSelector = isAdmin;

  if (loading || roleLoading) {
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

  if (companies.length === 0 && isAdmin) {
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
    <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
      <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <SelectValue placeholder={toTitleCase('Selecione uma empresa')} />
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
