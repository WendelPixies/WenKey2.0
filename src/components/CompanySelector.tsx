import { useEffect, useState } from 'react';
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
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Clear company selection for admins on mount if they just logged in
  // This ensures the modal appears
  useEffect(() => {
    if (!user || roleLoading || hasInitialized) return;

    if (role === 'admin' && selectedCompany) {
      // Check if this is a fresh login by seeing if we have a session start marker
      const sessionStart = sessionStorage.getItem('admin_session_started');
      if (!sessionStart) {
        console.log('Fresh admin login detected, clearing company selection');
        setSelectedCompany(null);
        sessionStorage.setItem('admin_session_started', 'true');
      }
    }

    setHasInitialized(true);
  }, [user, role, roleLoading]);

  useEffect(() => {
    // Wait for user, role to be loaded, and role to be non-null
    if (!user || roleLoading || !role) return;

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
              // If no selection, or selection not valid (e.g. inactive)
              // Only auto-select for non-admins. Admins must choose via the modal (or manual selection).
              if (!isAdmin) {
                if (!selectedCompany) {
                  setSelectedCompany(companyList[0]);
                } else {
                  // The current selection is NOT in the active list.
                  setSelectedCompany(companyList[0]);
                }
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

  // Render static display with Click-to-Change for Admins
  const [open, setOpen] = useState(false);

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
            {/* Optional: Add a small icon to indicate interactiveness, e.g. Chevrons */}
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
