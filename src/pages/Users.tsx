import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { toTitleCase } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  position: string | null;
  sector: string | null;
  permission_type: 'user' | 'manager' | 'admin';
  avatar_url: string | null;
  is_active: boolean;
  company_id: string | null;
  companies?: Company | null;
}

interface Company {
  id: string;
  name: string;
  sectors: string[];
}

interface CompanyMember {
  company_id: string;
  user_id: string;
  companies: Company;
}

export default function Users() {
  const { user, profile } = useAuth();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    position: '',
    sector: '',
    permission_type: 'user' as 'user' | 'manager' | 'admin',
    company_id: '',
    avatar_file: null as File | null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users with companies
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies:company_id (
            id,
            name,
            sectors
          )
        `)
        .order('full_name');

      if (profilesError) throw profilesError;
      const normalized = (profilesData || []).map((p: any) => {
        let avatarUrl = p.avatar_url;
        if (avatarUrl && !String(avatarUrl).startsWith('http')) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
          avatarUrl = data.publicUrl;
        }

        return {
          ...p,
          avatar_url: avatarUrl,
        };
      });
      setUsers(normalized);

      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Load company members
      const { data: membersData, error: membersError } = await supabase
        .from('company_members')
        .select('*, companies(*)');

      if (membersError) throw membersError;
      setCompanyMembers(membersData || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserCompany = (user: Profile) => {
    return user.companies?.name || '-';
  };

  const getCompanySectors = (companyId: string | null | undefined) => {
    if (!companyId) return [];
    const company = companies.find((c) => c.id === companyId);
    return (company?.sectors || []).filter(Boolean);
  };

  const handleCreate = async () => {
    try {
      if (!formData.full_name || !formData.email || !formData.password || !formData.company_id) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      // Create user in Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        let avatarUrl = null;

        // Upload avatar if provided
        if (formData.avatar_file) {
          const fileExt = formData.avatar_file.name.split('.').pop();
          const filePath = `${authData.user.id}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, formData.avatar_file, {
              upsert: true,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            avatarUrl = publicUrl;
          }
        }

        // Update profile with additional data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            position: formData.position || null,
            sector: formData.sector || null,
            permission_type: formData.permission_type,
            company_id: formData.company_id,
            avatar_url: avatarUrl,
          })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;

        // Add to company
        const { error: memberError } = await supabase
          .from('company_members')
          .insert({
            user_id: authData.user.id,
            company_id: formData.company_id,
          });

        if (memberError) throw memberError;

        toast.success('Usuário criado com sucesso!');
        setIsCreateDialogOpen(false);
        resetForm();
        loadData();
      }
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message);
    }
  };

  const handleEdit = async () => {
    try {
      if (!selectedUser) return;

      let avatarUrl = selectedUser.avatar_url;

      // Upload new avatar if provided
      if (formData.avatar_file) {
        const fileExt = formData.avatar_file.name.split('.').pop();
        const filePath = `${selectedUser.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData.avatar_file, {
            upsert: true,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          position: formData.position || null,
          sector: formData.sector || null,
          permission_type: formData.permission_type,
          company_id: formData.company_id || null,
          avatar_url: avatarUrl,
          is_active: selectedUser.is_active,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Update company membership if changed
      if (formData.company_id && formData.company_id !== selectedUser.company_id) {
        // Remove old membership
        await supabase
          .from('company_members')
          .delete()
          .eq('user_id', selectedUser.id);

        // Add new membership
        const { error: memberError } = await supabase
          .from('company_members')
          .insert({
            user_id: selectedUser.id,
            company_id: formData.company_id,
          });

        if (memberError) throw memberError;
      }

      toast.success('Usuário atualizado com sucesso!');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    }
  };

  const handleDelete = async () => {
    try {
      if (!selectedUser) return;

      // Delete company members
      const { error: memberError } = await supabase
        .from('company_members')
        .delete()
        .eq('user_id', selectedUser.id);

      if (memberError) throw memberError;

      // Note: Deleting from profiles will cascade to auth.users due to trigger
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      toast.error('Erro ao excluir usuário: ' + error.message);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Status atualizado com sucesso!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  };

  const openEditDialog = (user: Profile) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      position: user.position || '',
      sector: user.sector || '',
      permission_type: user.permission_type,
      company_id: user.company_id || '',
      avatar_file: null,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: Profile) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      position: '',
      sector: '',
      permission_type: 'user',
      company_id: '',
      avatar_file: null,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = users.filter(user => {
    const effectiveCompanyId = isAdmin ? filterCompanyId : profile?.company_id;
    const matchesCompany = (isAdmin && filterCompanyId === 'all') ||
      user.company_id === effectiveCompanyId;

    // Status is 'active' only if is_active is true AND company_id exists
    const isUserActive = user.is_active && user.company_id;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && isUserActive) ||
      (filterStatus === 'pending' && !isUserActive);

    return matchesCompany && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{toTitleCase('Gestão de Usuários')}</h1>
          {isAdmin && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {toTitleCase('Novo Usuário')}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{toTitleCase('Lista de Usuários')}</CardTitle>
              {isAdmin && (
                <div className="flex gap-4 w-full max-w-2xl">
                  <div className="flex-1">
                    <Select value={filterCompanyId} onValueChange={setFilterCompanyId}>
                      <SelectTrigger>
                        <SelectValue placeholder={toTitleCase('Filtrar por empresa')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as empresas</SelectItem>
                        {companies.filter(c => c.id).map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {toTitleCase(company.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={toTitleCase('Filtrar por status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{toTitleCase('Carregando...')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{toTitleCase('Usuário')}</TableHead>
                    <TableHead>{toTitleCase('Email')}</TableHead>
                    <TableHead>{toTitleCase('Empresa')}</TableHead>
                    <TableHead>{toTitleCase('Setor')}</TableHead>
                    <TableHead>{toTitleCase('Permissão')}</TableHead>
                    <TableHead>{toTitleCase('Status')}</TableHead>
                    <TableHead className="text-right">{toTitleCase('Ações')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{toTitleCase(user.full_name)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{toTitleCase(getUserCompany(user))}</TableCell>
                      <TableCell>{user.sector || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.permission_type === 'admin' ? 'default' : 'secondary'}>
                          {toTitleCase(user.permission_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto hover:bg-transparent"
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                        >
                          {(() => {
                            const isUserActive = user.is_active && user.company_id;
                            return (
                              <Badge
                                variant={isUserActive ? 'default' : 'secondary'}
                                className={!isUserActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' : ''}
                              >
                                {isUserActive ? toTitleCase('Ativo') : toTitleCase('Pendente')}
                              </Badge>
                            );
                          })()}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="company">Empresa *</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={value =>
                    setFormData({ ...formData, company_id: value, sector: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sector">Setor</Label>
                <Select
                  value={formData.sector}
                  onValueChange={value => setFormData({ ...formData, sector: value })}
                  disabled={getCompanySectors(formData.company_id).length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        getCompanySectors(formData.company_id).length === 0
                          ? 'Nenhum setor cadastrado para esta empresa'
                          : 'Selecione um setor'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getCompanySectors(formData.company_id).map(sector => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={e => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="permission">Permissão</Label>
                <Select
                  value={formData.permission_type}
                  onValueChange={value =>
                    setFormData({ ...formData, permission_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="avatar">Foto do Perfil</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={e => setFormData({ ...formData, avatar_file: e.target.files?.[0] || null })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>Criar Usuário</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize os dados do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_full_name">Nome Completo</Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_company">Empresa</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={value =>
                    setFormData({ ...formData, company_id: value, sector: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_sector">Setor</Label>
                <Select
                  value={formData.sector}
                  onValueChange={value => setFormData({ ...formData, sector: value })}
                  disabled={getCompanySectors(formData.company_id).length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        getCompanySectors(formData.company_id).length === 0
                          ? 'Nenhum setor cadastrado para esta empresa'
                          : 'Selecione um setor'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getCompanySectors(formData.company_id).map(sector => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_position">Cargo</Label>
                <Input
                  id="edit_position"
                  value={formData.position}
                  onChange={e => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_permission">Permissão</Label>
                <Select
                  value={formData.permission_type}
                  onValueChange={value =>
                    setFormData({ ...formData, permission_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_avatar">Foto do Perfil</Label>
                <Input
                  id="edit_avatar"
                  type="file"
                  accept="image/*"
                  onChange={e => setFormData({ ...formData, avatar_file: e.target.files?.[0] || null })}
                />
                {selectedUser?.avatar_url && (
                  <p className="text-sm text-muted-foreground mt-1">Avatar atual será substituído se você selecionar um novo arquivo</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuário{' '}
                <strong>{selectedUser?.full_name}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
