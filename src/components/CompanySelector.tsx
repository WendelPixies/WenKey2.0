import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

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
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('CompanySelector: fetchCompanies timed out');
          setLoading(false);
        }
      }, 5000);

      try {
        let companyList: Company[] = [];

        if (role === 'admin') {
          // Admin can see all active companies
          const { data, error } = await supabase
            .from('companies')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

          if (error) throw error;
          companyList = data || [];
        } else {
          // Normal users only see active companies they are members of
          const { data, error } = await supabase
            .from('company_members')
            .select('company_id, companies(id, name, is_active)')
            .eq('user_id', user.id);

          if (error) throw error;

          companyList = data
            .map((item: any) => item.companies)
            .filter((c: any) => c && c.is_active) as Company[];

          // Sort by name
          companyList.sort((a, b) => a.name.localeCompare(b.name));
        }

        if (mounted) {
          setCompanies(companyList);

          // Use the latest selectedCompanyId from context/ref if possible
          // But since we are in an effect, we use the value from capture
          const hasCurrentCompany = companyList.some(
            (company) => company.id === selectedCompanyId
          );

          // Auto-select first company if none selected or current selection is invalid
          if ((!selectedCompanyId || !hasCurrentCompany) && companyList.length > 0) {
            setSelectedCompanyId(companyList[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCompanies();

    return () => {
      mounted = false;
    };
    // Only re-fetch when user or role changes
  }, [user, role, roleLoading, setSelectedCompanyId]);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const isAdmin = role === 'admin';
  const showSelector = isAdmin || companies.length > 1;

  if (loading || roleLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-sidebar-accent">
        <Building2 className="w-4 h-4 text-sidebar-foreground/60" />
        <span className="text-sm text-sidebar-foreground/60">
          Carregando...
        </span>
      </div>
    );
  }

  if (!showSelector) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent border border-sidebar-border text-sidebar-foreground">
        <Building2 className="w-4 h-4 text-sidebar-foreground/80" />
        <div className="flex flex-col">
          <span className="text-xs text-sidebar-foreground/60">Empresa atual</span>
          <span className="text-sm font-semibold">
            {selectedCompany?.name ?? 'Nenhuma empresa vinculada'}
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
          Nenhuma empresa
        </span>
      </div>
    );
  }

  return (
    <Select value={selectedCompanyId || undefined} onValueChange={setSelectedCompanyId}>
      <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <SelectValue placeholder="Selecione uma empresa" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
