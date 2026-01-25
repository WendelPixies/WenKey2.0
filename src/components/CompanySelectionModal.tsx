import { useEffect, useState } from 'react';
import { useCompany, Company } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Check, Loader2 } from 'lucide-react';
import { cn, toTitleCase } from '@/lib/utils'; // Assuming cn and toTitleCase are available

export function CompanySelectionModal() {
    const { selectedCompany, setSelectedCompany } = useCompany();
    const { user, profile, loading: authLoading } = useAuth();
    const { role, loading: roleLoading } = useUserRole();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    // Determine if modal should be open
    // Open if: User is logged in + Auth is loaded + Profile is loaded + Role is Admin + No company selected
    // This ensures we don't show the modal before we know the user's role
    const isOpen = !!user && !authLoading && !!profile && !roleLoading && role === 'admin' && !selectedCompany;

    // Debug logging
    useEffect(() => {
        console.log('CompanySelectionModal state:', {
            user: !!user,
            authLoading,
            profile: !!profile,
            roleLoading,
            role,
            selectedCompany,
            isOpen
        });
    }, [user, authLoading, profile, roleLoading, role, selectedCompany, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        let mounted = true;
        const fetchCompanies = async () => {
            setLoading(true);
            try {
                // Admin user - fetch all active companies
                const { data, error } = await supabase
                    .from('companies')
                    .select('id, name')
                    .eq('is_active', true)
                    .order('name');

                if (error) throw error;

                if (mounted) {
                    setCompanies(data || []);
                }
            } catch (error) {
                console.error('Error fetching companies for modal:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchCompanies();
        return () => { mounted = false; };
    }, [isOpen]);

    const handleSelect = (company: Company) => {
        setSelectedCompany(company);
        // Modal will close automatically because !selectedCompany will become false
    };

    if (!isOpen) return null;

    return (
        <Dialog open={true} onOpenChange={() => { }}>
            <DialogContent
                className="max-w-md [&>button]:hidden"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">Selecione uma Empresa</DialogTitle>
                    <DialogDescription className="text-center">
                        Como administrador, você precisa selecionar uma empresa para continuar.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Carregando empresas...</p>
                        </div>
                    ) : companies.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Nenhuma empresa ativa encontrada.</p>
                        </div>
                    ) : (
                        companies.map((company) => (
                            <Button
                                key={company.id}
                                variant="outline"
                                className={cn(
                                    "w-full justify-between h-auto py-4 px-4 hover:border-primary hover:bg-primary/5 group transition-all",
                                    selectedCompany?.id === company.id && "border-primary bg-primary/5"
                                )}
                                onClick={() => handleSelect(company)}
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
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
