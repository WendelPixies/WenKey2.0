import { useEffect, useState, useRef } from 'react';
import { useCompany, Company } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Check } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { toTitleCase, cn } from '@/lib/utils';

export function CompanySelector() {
  const { selectedCompany, setSelectedCompany } = useCompany();
  const { user, profile } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Strict lock to prevent any loops
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (!user || roleLoading || !role) return;

    let mounted = true;
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        let companyList: Company[] = [];
        const isAdmin = role === 'admin';

        if (isAdmin) {
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

          companyList = (data || [])
            .map((item: any) => item.companies)
            .filter((c: any) => c && c.is_active) as Company[];

          companyList.sort((a, b) => a.name.localeCompare(b.name));
        }

        if (mounted) {
          setCompanies(companyList);
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCompanies();
    return () => { mounted = false; };
  }, [user, role, roleLoading]);

  // SIMPLIFIED Auto-selection - runs ONCE only
  useEffect(() => {
    // Absolute guard: if we've already tried, NEVER run again
    if (hasAutoSelected.current) return;

    // Only proceed if we have companies and no selection
    if (companies.length === 0 || selectedCompany) return;

    // Find target company
    let targetCompany: Company | undefined;

    // Priority 1: User's registered company
    if (profile?.company_id) {
      targetCompany = companies.find(c => c.id === profile.company_id);
    }

    // Priority 2: First available
    if (!targetCompany) {
      targetCompany = companies[0];
    }

    // Set and lock
    if (targetCompany) {
      console.log('[CompanySelector] Auto-selecting:', targetCompany.name);
      setSelectedCompany(targetCompany);
      hasAutoSelected.current = true;
    }
  }, [companies, selectedCompany, profile, setSelectedCompany]);

  const isAdmin = role === 'admin';
  const showSelector = isAdmin;

  // Loading state
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

  // Non-admin view
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

  // No companies available
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

  // Admin selector
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent border border-sidebar-border text-sidebar-foreground transition-colors",
          isAdmin && "cursor-pointer hover:bg-sidebar-accent/80 hover:border-sidebar-primary/30"
        )}
        onClick={() => isAdmin && setOpen(true)}
      >
        <div className="w-8 h-8 rounded-md bg-sidebar-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-sidebar-primary" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-sidebar-foreground/60 truncate">{toTitleCase('Empresa')}</span>
          <span className="text-sm font-semibold truncate" title={selectedCompany?.name || ''}>
            {selectedCompany ? toTitleCase(selectedCompany.name) : toTitleCase('Selecione...')}
          </span>
        </div>
        {isAdmin && (
          <div className="ml-auto text-sidebar-foreground/40">
            {/* Optional icon */}
          </div>
        )}
      </div>

      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Trocar Empresa</DialogTitle>
              <DialogDescription className="text-center">
                Selecione a empresa que deseja gerenciar.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2">
              {companies.map((company) => (
                <Button
                  key={company.id}
                  variant="outline"
                  className={cn(
                    "w-full justify-between h-auto py-4 px-4 hover:border-primary hover:bg-primary/5 group transition-all",
                    selectedCompany?.id === company.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => {
                    setSelectedCompany(company);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-base">{toTitleCase(company.name)}</span>
                    </div>
                  </div>
                  {selectedCompany?.id === company.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
