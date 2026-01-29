import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Edit, Users as UsersIcon, MapPin, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { toTitleCase } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  responsible: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  sectors: string[];
}

export default function Companies() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    responsible: '',
    phone: '',
    city: '',
    state: '',
    sectors: '',
  });

  const fetchCompanies = async () => {
    try {
      if (isAdmin) {
        // Admin vê todas as empresas
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('name');

        if (error) throw error;
        setCompanies(data || []);
      } else {
        // Manager/User vê apenas suas empresas
        const { data, error } = await supabase
          .from('company_members')
          .select('companies(*)')
          .eq('user_id', user?.id);

        if (error) throw error;

        const companyList = data.map((item: any) => item.companies).filter(Boolean);
        setCompanies(companyList);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  const isUniqueViolation = (error: any) =>
    error?.code === '23505' || error?.message?.includes('companies_cnpj_key');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sectors = formData.sectors.split(',').map(s => s.trim()).filter(Boolean);

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          cnpj: formData.cnpj || null,
          responsible: formData.responsible || null,
          phone: formData.phone || null,
          city: formData.city || null,
          state: formData.state || null,
          sectors,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Add current user as member
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          company_id: newCompany.id,
          user_id: user?.id,
        });

      if (memberError) throw memberError;

      toast.success('Empresa criada com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        cnpj: '',
        responsible: '',
        phone: '',
        city: '',
        state: '',
        sectors: '',
      });
      fetchCompanies();
    } catch (error: any) {
      if (isUniqueViolation(error)) {
        toast.error('Empresa já existe com este CNPJ');
      } else {
        toast.error(error.message || 'Erro ao criar empresa');
      }
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCompany) return;

    try {
      const sectors = formData.sectors.split(',').map(s => s.trim()).filter(Boolean);

      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          cnpj: formData.cnpj || null,
          responsible: formData.responsible || null,
          phone: formData.phone || null,
          city: formData.city || null,
          state: formData.state || null,
          sectors,
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast.success('Empresa atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setEditingCompany(null);
      setFormData({
        name: '',
        cnpj: '',
        responsible: '',
        phone: '',
        city: '',
        state: '',
        sectors: '',
      });
      fetchCompanies();
    } catch (error: any) {
      if (isUniqueViolation(error)) {
        toast.error('Empresa já existe com este CNPJ');
      } else {
        toast.error(error.message || 'Erro ao atualizar empresa');
      }
    }
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      cnpj: company.cnpj || '',
      responsible: company.responsible || '',
      phone: company.phone || '',
      city: company.city || '',
      state: company.state || '',
      sectors: company.sectors.join(', '),
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (company: Company) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Excluir a empresa "${company.name}"?`);
    if (!confirmed) return;
    try {
      setDeletingId(company.id);
      const { error } = await supabase.from('companies').delete().eq('id', company.id);
      if (error) throw error;
      toast.success('Empresa excluída com sucesso');
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir empresa');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{toTitleCase('Empresas')}</h1>
            <p className="text-muted-foreground">
              {toTitleCase('Gerencie as empresas da sua organização')}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {toTitleCase('Nova Empresa')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{toTitleCase('Nova Empresa')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="name">{toTitleCase('Nome da Empresa')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">{toTitleCase('CNPJ')}</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsible">{toTitleCase('Responsável')}</Label>
                      <Input
                        id="responsible"
                        value={formData.responsible}
                        onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{toTitleCase('Telefone')}</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">{toTitleCase('Cidade')}</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">{toTitleCase('Estado')}</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="sectors">{toTitleCase('Setores (separados por vírgula)')}</Label>
                      <Input
                        id="sectors"
                        value={formData.sectors}
                        onChange={(e) => setFormData({ ...formData, sectors: e.target.value })}
                        placeholder="Tecnologia, Marketing, Vendas"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {toTitleCase('Criar Empresa')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                      <CardTitle className="text-base font-semibold leading-none">{toTitleCase(company.name)}</CardTitle>
                      {company.cnpj && (
                        <CardDescription className="text-xs font-mono">{company.cnpj}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(company)}
                          title="Editar empresa"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(company)}
                          title="Excluir empresa"
                          disabled={deletingId === company.id}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Badge
                      variant={company.is_active ? 'default' : 'secondary'}
                      className={company.is_active ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200 shadow-none" : ""}
                    >
                      {company.is_active ? toTitleCase('Ativa') : toTitleCase('Inativa')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-1">
                  {company.responsible && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider flex items-center gap-1">
                        <UsersIcon className="w-3 h-3" />
                        Responsável
                      </span>
                      <span className="text-sm font-medium truncate" title={toTitleCase(company.responsible)}>
                        {toTitleCase(company.responsible)}
                      </span>
                    </div>
                  )}
                  {company.city && company.state && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Localização
                      </span>
                      <span className="text-sm font-medium truncate" title={`${toTitleCase(company.city)}, ${toTitleCase(company.state)}`}>
                        {toTitleCase(company.city)}, {toTitleCase(company.state)}
                      </span>
                    </div>
                  )}
                </div>

                {company.sectors && company.sectors.length > 0 && (
                  <div className="pt-3 border-t">
                    <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider mb-1 block">
                      Setores
                    </span>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {company.sectors.map((sector) => toTitleCase(sector)).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira empresa
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-name">Nome da Empresa *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cnpj">CNPJ</Label>
                  <Input
                    id="edit-cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-responsible">Responsável</Label>
                  <Input
                    id="edit-responsible"
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">Cidade</Label>
                  <Input
                    id="edit-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input
                    id="edit-state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-sectors">Setores (separados por vírgula)</Label>
                  <Input
                    id="edit-sectors"
                    value={formData.sectors}
                    onChange={(e) => setFormData({ ...formData, sectors: e.target.value })}
                    placeholder="Tecnologia, Marketing, Vendas"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Atualizar Empresa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
