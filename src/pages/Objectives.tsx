import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp, Pencil, Target, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreateObjectiveDialog } from '@/components/CreateObjectiveDialog';
import { AddKRDialog } from '@/components/AddKRDialog';
import { EditObjectiveDialog } from '@/components/EditObjectiveDialog';
import { EditKRDialog } from '@/components/EditKRDialog';
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
import { useToast } from '@/hooks/use-toast';

interface Quarter {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  company_id: string;
}

interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  sector: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface Objective {
  id: string;
  title: string;
  description: string | null;
  status: string;
  quarter_id: string;
  company_id: string;
  user_id: string;
  archived: boolean;
  percent_obj: number;
}

interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  code: string | null;
  target: number | null;
  current: number;
  percent_kr: number;
}

interface KRCheckin {
  key_result_id: string;
  attainment_pct: number | null;
  created_at: string;
}

interface ObjectiveWithProgress extends Objective {
  progress: number;
  key_results: KeyResultWithProgress[];
}

interface KeyResultWithProgress extends KeyResult {
  progress: number;
  owner_name: string | null;
}

export default function Objectives() {
  const { user } = useAuth();
  const { isAdmin, isUser } = useUserRole();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompanyId, setFilterCompanyId] = useState<string>('');
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [selectedQuarterId, setSelectedQuarterId] = useState<string>('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [objectives, setObjectives] = useState<ObjectiveWithProgress[]>([]);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [objectiveToDelete, setObjectiveToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [krToDelete, setKrToDelete] = useState<string | null>(null);
  const [isDeletingKr, setIsDeletingKr] = useState(false);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (filterCompanyId) {
      loadQuarters();
      loadUsers();
    }
  }, [filterCompanyId]);

  useEffect(() => {
    if (profile && selectedQuarterId && filterCompanyId && filterUserId) {
      loadObjectives();
    }
  }, [profile, selectedQuarterId, filterCompanyId, filterUserId]);

  // Realtime subscription para atualizar percentuais automaticamente
  useEffect(() => {
    if (!profile || !selectedQuarterId) return;

    const channel = supabase
      .channel('objectives-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'objectives',
          filter: `quarter_id=eq.${selectedQuarterId}`,
        },
        () => {
          loadObjectives();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'key_results',
        },
        () => {
          loadObjectives();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kr_checkins',
        },
        () => {
          loadObjectives();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedQuarterId]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Carregar perfil do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, company_id, full_name, sector')
        .eq('id', user.id)
        .single();

      if (!profileData || !profileData.company_id) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Carregar dados da empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', profileData.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
      }

      // Carregar empresas para o filtro baseado na permissão do usuário
      if (isAdmin) {
        // Admin: carregar todas as empresas
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');
        
        if (companiesData) {
          setCompanies(companiesData);
        }
      } else {
        // User/Manager: apenas sua empresa
        setCompanies(companyData ? [companyData] : []);
      }

      // Definir empresa padrão no filtro
      setFilterCompanyId(profileData.company_id);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      setLoading(false);
    }
  };

  const loadQuarters = async () => {
    if (!filterCompanyId) return;

    try {
      // Limpar quarter e usuário ao mudar de empresa
      setSelectedQuarterId('');
      setQuarters([]);
      setFilterUserId('');

      const { data: quartersData } = await supabase
        .from('quarters')
        .select('id, name, start_date, end_date, company_id')
        .eq('company_id', filterCompanyId)
        .order('start_date', { ascending: false });

      if (quartersData && quartersData.length > 0) {
        setQuarters(quartersData);

        // Identificar quarter atual
        const today = new Date().toISOString().split('T')[0];
        const currentQuarter = quartersData.find(
          q => q.start_date <= today && q.end_date >= today
        );

        if (currentQuarter) {
          setSelectedQuarterId(currentQuarter.id);
        } else {
          setSelectedQuarterId(quartersData[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar quarters:', error);
    }
  };

  const loadUsers = async () => {
    if (!filterCompanyId) return;

    try {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, company_id, full_name, sector')
        .eq('company_id', filterCompanyId)
        .eq('is_active', true)
        .order('full_name');

      if (usersData) {
        setUsers(usersData);
        // Definir usuário padrão (usuário logado)
        if (user) {
          setFilterUserId(user.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadObjectives = async () => {
    if (!user || !profile || !selectedQuarterId || !filterCompanyId || !filterUserId) return;

    try {
      // Carregar objetivos do usuário selecionado no quarter selecionado
      const { data: objectivesData } = await supabase
        .from('objectives')
        .select('id, title, description, status, quarter_id, company_id, user_id, archived, percent_obj')
        .eq('company_id', filterCompanyId)
        .eq('user_id', filterUserId)
        .eq('quarter_id', selectedQuarterId)
        .eq('archived', false)
        .neq('status', 'rascunho')
        .order('created_at', { ascending: false });

      if (!objectivesData || objectivesData.length === 0) {
        setObjectives([]);
        return;
      }

      const objectiveIds = objectivesData.map(obj => obj.id);

      // Carregar key results dos objetivos
      const { data: krsData } = await supabase
        .from('key_results')
        .select('id, objective_id, title, code, target, current, percent_kr')
        .in('objective_id', objectiveIds);

      if (!krsData || krsData.length === 0) {
        // Objetivos sem KRs
        const objsWithProgress: ObjectiveWithProgress[] = objectivesData.map(obj => ({
          ...obj,
          progress: obj.percent_obj || 0,
          key_results: []
        }));
        setObjectives(objsWithProgress);
        return;
      }

      // Usar percent_kr salvo no banco de dados
      const krsWithProgress: KeyResultWithProgress[] = krsData.map(kr => ({
        ...kr,
        progress: Math.round(kr.percent_kr || 0),
        owner_name: null
      }));

      // Agrupar KRs por objetivo e usar percent_obj salvo
      const objsWithProgress: ObjectiveWithProgress[] = objectivesData.map(obj => {
        const objKrs = krsWithProgress.filter(kr => kr.objective_id === obj.id);
        
        // Ordenar KRs por progresso (maior primeiro)
        objKrs.sort((a, b) => b.progress - a.progress);

        return {
          ...obj,
          progress: Math.round(obj.percent_obj || 0),
          key_results: objKrs
        };
      });

      setObjectives(objsWithProgress);
    } catch (error) {
      console.error('Erro ao carregar objetivos:', error);
    }
  };

  const toggleObjective = (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  };

  const handleDeleteClick = (objectiveId: string) => {
    setObjectiveToDelete(objectiveId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!objectiveToDelete || !isAdmin) return;

    setIsDeleting(true);
    try {
      // Primeiro, deletar todos os Key Results associados
      const { error: krError } = await supabase
        .from('key_results')
        .delete()
        .eq('objective_id', objectiveToDelete);

      if (krError) throw krError;

      // Depois, deletar o objetivo
      const { error: objError } = await supabase
        .from('objectives')
        .delete()
        .eq('id', objectiveToDelete);

      if (objError) throw objError;

      toast({
        title: 'Sucesso',
        description: 'Objetivo excluído com sucesso!',
      });

      // Recarregar objetivos
      await loadObjectives();
      
      setDeleteDialogOpen(false);
      setObjectiveToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir objetivo:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir objetivo',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      'ativo': { label: 'Ativo', variant: 'default' },
      'concluído': { label: 'Concluído', variant: 'secondary' },
      'arquivado': { label: 'Arquivado', variant: 'destructive' },
      'not_started': { label: 'Não Iniciado', variant: 'secondary' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const handleDeleteKrConfirm = async () => {
    if (!krToDelete || !isAdmin) return;

    setIsDeletingKr(true);
    try {
      const { error } = await supabase
        .from('key_results')
        .delete()
        .eq('id', krToDelete);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Key Result excluído com sucesso!',
      });

      setKrToDelete(null);
      await loadObjectives();
    } catch (error: any) {
      console.error('Erro ao excluir Key Result:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir Key Result',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingKr(false);
    }
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'hsl(142, 76%, 36%)';
    if (pct >= 50) return 'hsl(48, 96%, 53%)';
    return 'hsl(0, 84%, 60%)';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando objetivos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Perfil não encontrado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Não foi possível carregar seu perfil. Por favor, faça login novamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Objetivos e Key Results</h1>
          {isAdmin && profile && selectedQuarterId && (
            <CreateObjectiveDialog
              onSuccess={loadObjectives}
              currentQuarterId={selectedQuarterId}
              currentCompanyId={profile.company_id}
            />
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Dropdown de Empresa - PRIMEIRO */}
              <div className="space-y-2">
                <Label htmlFor="company-select">Empresa</Label>
                <Select
                  value={filterCompanyId}
                  onValueChange={setFilterCompanyId}
                >
                  <SelectTrigger id="company-select" className="bg-background">
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {companies.map(comp => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dropdown de Quarter - SEGUNDO (depende da empresa) */}
              <div className="space-y-2">
                <Label htmlFor="quarter-select">Quarter</Label>
                <Select
                  value={selectedQuarterId}
                  onValueChange={setSelectedQuarterId}
                  disabled={!filterCompanyId || quarters.length === 0}
                >
                  <SelectTrigger id="quarter-select" className="bg-background">
                    <SelectValue placeholder="Selecione um quarter" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {quarters.map(quarter => (
                      <SelectItem key={quarter.id} value={quarter.id}>
                        {quarter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dropdown de Usuário - TERCEIRO (depende da empresa) */}
              <div className="space-y-2">
                <Label htmlFor="user-select">Usuário</Label>
                {isUser ? (
                  <div className="h-10 px-3 py-2 rounded-md border bg-muted/40 flex items-center text-sm text-muted-foreground">
                    {profile?.full_name || 'Usuário atual'}
                  </div>
                ) : (
                  <Select
                    value={filterUserId}
                    onValueChange={setFilterUserId}
                    disabled={!filterCompanyId || users.length === 0}
                  >
                    <SelectTrigger id="user-select" className="bg-background">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Objetivos Cadastrados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objetivos Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {objectives.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  Nenhum objetivo cadastrado ainda. Crie seu primeiro objetivo!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {objectives.map(objective => (
                  <Collapsible
                    key={objective.id}
                    open={expandedObjectives.has(objective.id)}
                    onOpenChange={() => toggleObjective(objective.id)}
                  >
                    <Card className="border-2 hover:border-primary/50 transition-colors">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 text-left space-y-2">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-xl">{objective.title}</CardTitle>
                                {getStatusBadge(objective.status)}
                              </div>
                              
                              {objective.description && (
                                <p className="text-sm text-muted-foreground">
                                  {objective.description}
                                </p>
                              )}

                              {/* Progresso do Objetivo */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Progresso</span>
                                  <span className="font-bold">{objective.progress}%</span>
                                </div>
                                <Progress 
                                  value={objective.progress}
                                  style={{ '--progress-color': getProgressColor(objective.progress) } as any}
                                />
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {objective.key_results.length} {objective.key_results.length === 1 ? 'Key Result' : 'Key Results'}
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {expandedObjectives.has(objective.id) ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {isAdmin && (
                            <div className="flex justify-between items-center mb-4 border-t pt-4">
                              <div className="flex gap-2">
                                <EditObjectiveDialog
                                  objective={{
                                    id: objective.id,
                                    title: objective.title,
                                    description: objective.description,
                                    user_id: objective.user_id,
                                    company_id: objective.company_id,
                                    quarter_id: objective.quarter_id,
                                  }}
                                  onSuccess={loadObjectives}
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(objective.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </Button>
                              </div>
                              <AddKRDialog
                                objectiveId={objective.id}
                                companyId={objective.company_id}
                                quarterId={objective.quarter_id}
                                onSuccess={loadObjectives}
                              />
                            </div>
                          )}

                          {objective.key_results.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhum Key Result vinculado a este objetivo.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {objective.key_results.map(kr => (
                                <Card key={kr.id} className="bg-muted/50">
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 space-y-1">
                                        <div className="font-medium">
                                          {kr.code && <span className="text-primary">{kr.code}</span>}
                                          {kr.code && ' - '}
                                          {kr.title}
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <div>
                                            <span className="font-medium">Atual:</span> {kr.current}
                                          </div>
                                          {kr.target !== null && (
                                            <div>
                                              <span className="font-medium">Meta:</span> {kr.target}
                                            </div>
                                          )}
                                          {kr.owner_name && (
                                            <div>
                                              <span className="font-medium">Responsável:</span> {kr.owner_name}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex-shrink-0 text-right flex items-center gap-2">
                                        <Badge 
                                          variant="secondary"
                                          className="font-bold"
                                          style={{ 
                                            backgroundColor: getProgressColor(kr.progress) + '20',
                                            color: getProgressColor(kr.progress)
                                          }}
                                        >
                                          {kr.progress}%
                                        </Badge>
                                        {isAdmin && (
                                          <>
                                            <EditKRDialog
                                              krId={kr.id}
                                              companyId={objective.company_id}
                                              onSuccess={loadObjectives}
                                              trigger={
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  aria-label="Editar Key Result"
                                                >
                                                  <Pencil className="h-4 w-4" />
                                                </Button>
                                              }
                                            />
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-destructive"
                                              aria-label="Excluir Key Result"
                                              onClick={() => setKrToDelete(kr.id)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <Progress 
                                      value={kr.progress}
                                      style={{ '--progress-color': getProgressColor(kr.progress) } as any}
                                      className="h-2"
                                    />
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este objetivo? Esta ação não pode ser desfeita e todos os Key Results associados também serão excluídos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={krToDelete !== null} onOpenChange={(open) => !open && !isDeletingKr && setKrToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclus�o do Key Result</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este Key Result? Esta a��o n�o pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingKr}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteKrConfirm}
                disabled={isDeletingKr}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingKr ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
