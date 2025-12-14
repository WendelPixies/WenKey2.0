import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

interface Quarter {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  company_id: string;
  is_active: boolean;
}

interface CheckIn {
  id: string;
  quarter_id: string;
  company_id: string | null;
  key_result_id: string | null;
  user_id: string | null;
  value: number | null;
  result_percent: number | null;
  note: string | null;
  checkin_date: string;
  checkin_dates: string | null;
  occurred_at: string | null;
  created_at: string;
}

interface QuarterFormData {
  name: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
}

interface CheckInFormData {
  occurred_at: Date | undefined;
  note: string;
}

export default function Quarters() {
  const { selectedCompanyId } = useCompany();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, CheckIn[]>>({});
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCompanyForForm, setSelectedCompanyForForm] = useState<string>('');
  
  // Quarter dialog states
  const [quarterDialogOpen, setQuarterDialogOpen] = useState(false);
  const [editingQuarter, setEditingQuarter] = useState<Quarter | null>(null);
  const [quarterFormData, setQuarterFormData] = useState<QuarterFormData>({
    name: '',
    start_date: undefined,
    end_date: undefined,
  });
  
  // Check-in dialog states
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter | null>(null);
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | null>(null);
  const [checkInFormData, setCheckInFormData] = useState<CheckInFormData>({
    occurred_at: undefined,
    note: '',
  });
  
  // Delete dialogs
  const [deleteQuarterDialog, setDeleteQuarterDialog] = useState<Quarter | null>(null);
  const [deleteCheckInDialog, setDeleteCheckInDialog] = useState<CheckIn | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      setSelectedCompanyForForm(selectedCompanyId);
      loadQuarters();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyForForm) {
      loadQuarters();
    }
  }, [selectedCompanyForForm]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadQuarters = async () => {
    if (!selectedCompanyForForm) {
      setQuarters([]);
      setCheckIns({});
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data: quartersData, error: quartersError } = await supabase
        .from('quarters')
        .select('*')
        .eq('company_id', selectedCompanyForForm)
        .order('start_date', { ascending: true });

      if (quartersError) throw quartersError;
      setQuarters(quartersData || []);

      // Load check-ins for all quarters
      if (quartersData && quartersData.length > 0) {
        const quarterIds = quartersData.map(q => q.id);
        const { data: checkInsData, error: checkInsError } = await supabase
          .from('checkins')
          .select('*')
          .in('quarter_id', quarterIds)
          .order('checkin_date', { ascending: true });

        if (checkInsError) throw checkInsError;

        // Group check-ins by quarter
        const grouped = (checkInsData || []).reduce((acc, checkIn) => {
          if (!acc[checkIn.quarter_id]) {
            acc[checkIn.quarter_id] = [];
          }
          acc[checkIn.quarter_id].push(checkIn);
          return acc;
        }, {} as Record<string, CheckIn[]>);

        setCheckIns(grouped);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar quarters',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleQuarter = (quarterId: string) => {
    const newExpanded = new Set(expandedQuarters);
    if (newExpanded.has(quarterId)) {
      newExpanded.delete(quarterId);
    } else {
      newExpanded.add(quarterId);
    }
    setExpandedQuarters(newExpanded);
  };

  const handleCreateQuarter = async () => {
    if (!selectedCompanyForForm || !quarterFormData.name || !quarterFormData.start_date || !quarterFormData.end_date) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione uma empresa e preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('quarters').insert({
        name: quarterFormData.name,
        start_date: format(quarterFormData.start_date, 'yyyy-MM-dd'),
        end_date: format(quarterFormData.end_date, 'yyyy-MM-dd'),
        company_id: selectedCompanyForForm,
      });

      if (error) throw error;

      toast({
        title: 'Quarter criado',
        description: 'Quarter criado com sucesso',
      });

      setQuarterDialogOpen(false);
      resetQuarterForm();
      loadQuarters();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar quarter',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditQuarter = async () => {
    if (!editingQuarter || !quarterFormData.name || !quarterFormData.start_date || !quarterFormData.end_date) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('quarters')
        .update({
          name: quarterFormData.name,
          start_date: format(quarterFormData.start_date, 'yyyy-MM-dd'),
          end_date: format(quarterFormData.end_date, 'yyyy-MM-dd'),
        })
        .eq('id', editingQuarter.id);

      if (error) throw error;

      toast({
        title: 'Quarter atualizado',
        description: 'Quarter atualizado com sucesso',
      });

      setQuarterDialogOpen(false);
      setEditingQuarter(null);
      resetQuarterForm();
      loadQuarters();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar quarter',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteQuarter = async (quarter: Quarter) => {
    try {
      const { error } = await supabase
        .from('quarters')
        .delete()
        .eq('id', quarter.id);

      if (error) throw error;

      toast({
        title: 'Quarter excluído',
        description: 'Quarter excluído com sucesso',
      });

      setDeleteQuarterDialog(null);
      loadQuarters();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir quarter',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditQuarterDialog = (quarter: Quarter) => {
    setEditingQuarter(quarter);
    // Parse date strings correctly to avoid timezone issues
    const startParts = quarter.start_date.split('-').map(Number);
    const endParts = quarter.end_date.split('-').map(Number);
    
    setQuarterFormData({
      name: quarter.name,
      start_date: new Date(startParts[0], startParts[1] - 1, startParts[2]),
      end_date: new Date(endParts[0], endParts[1] - 1, endParts[2]),
    });
    setQuarterDialogOpen(true);
  };

  const resetQuarterForm = () => {
    setQuarterFormData({
      name: '',
      start_date: undefined,
      end_date: undefined,
    });
    setEditingQuarter(null);
  };

  // Check-in functions
  const handleCreateCheckIn = async () => {
    if (!selectedQuarter || !checkInFormData.occurred_at || !selectedCompanyForForm) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione uma data para o check-in',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('checkins').insert({
        quarter_id: selectedQuarter.id,
        company_id: selectedCompanyForForm,
        user_id: user.id,
        checkin_date: format(checkInFormData.occurred_at, 'yyyy-MM-dd'),
        occurred_at: format(checkInFormData.occurred_at, 'yyyy-MM-dd'),
        note: checkInFormData.note || null,
      });

      if (error) throw error;

      toast({
        title: 'Check-in criado',
        description: 'Check-in criado com sucesso',
      });

      setCheckInDialogOpen(false);
      resetCheckInForm();
      loadQuarters();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar check-in',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditCheckIn = async () => {
    if (!editingCheckIn || !checkInFormData.occurred_at) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione uma data para o check-in',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('checkins')
        .update({
          checkin_date: format(checkInFormData.occurred_at, 'yyyy-MM-dd'),
          occurred_at: format(checkInFormData.occurred_at, 'yyyy-MM-dd'),
          note: checkInFormData.note || null,
        })
        .eq('id', editingCheckIn.id);

      if (error) throw error;

      toast({
        title: 'Check-in atualizado',
        description: 'Check-in atualizado com sucesso',
      });

      setCheckInDialogOpen(false);
      setEditingCheckIn(null);
      resetCheckInForm();
      loadQuarters();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar check-in',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCheckIn = async (checkIn: CheckIn) => {
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('id', checkIn.id);

      if (error) throw error;

      toast({
        title: 'Check-in excluído',
        description: 'Check-in excluído com sucesso',
      });

      setDeleteCheckInDialog(null);
      loadQuarters();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir check-in',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openCreateCheckInDialog = (quarter: Quarter) => {
    setSelectedQuarter(quarter);
    setCheckInDialogOpen(true);
  };

  const openEditCheckInDialog = (checkIn: CheckIn, quarter: Quarter) => {
    setEditingCheckIn(checkIn);
    setSelectedQuarter(quarter);
    // Parse date string correctly to avoid timezone issues
    const dateStr = checkIn.checkin_date || checkIn.occurred_at;
    const dateParts = dateStr ? dateStr.split('-').map(Number) : null;
    const parsedDate = dateParts ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]) : new Date();
    
    setCheckInFormData({
      occurred_at: parsedDate,
      note: checkIn.note || '',
    });
    setCheckInDialogOpen(true);
  };

  const resetCheckInForm = () => {
    setCheckInFormData({
      occurred_at: undefined,
      note: '',
    });
    setEditingCheckIn(null);
    setSelectedQuarter(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Quarter/Check-ins</h1>
          <div className="flex gap-4 items-center">
            {companies.length > 0 && (
              <div className="w-64">
                <Select value={selectedCompanyForForm || ''} onValueChange={setSelectedCompanyForForm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.filter(c => c.id).map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAdmin && (
              <Dialog open={quarterDialogOpen} onOpenChange={(open) => {
                setQuarterDialogOpen(open);
                if (!open) resetQuarterForm();
              }}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedCompanyForForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Quarter
                  </Button>
                </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingQuarter ? 'Editar Quarter' : 'Novo Quarter'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Quarter *</Label>
                    <Input
                      id="name"
                      value={quarterFormData.name}
                      onChange={(e) => setQuarterFormData({ ...quarterFormData, name: e.target.value })}
                      placeholder="Q1 - 2026"
                    />
                  </div>
                  <div>
                    <Label>Data de Início *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !quarterFormData.start_date && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {quarterFormData.start_date ? format(quarterFormData.start_date, 'dd/MM/yyyy') : 'Selecione uma data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={quarterFormData.start_date}
                          onSelect={(date) => setQuarterFormData({ ...quarterFormData, start_date: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Data de Fim *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !quarterFormData.end_date && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {quarterFormData.end_date ? format(quarterFormData.end_date, 'dd/MM/yyyy') : 'Selecione uma data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={quarterFormData.end_date}
                          onSelect={(date) => setQuarterFormData({ ...quarterFormData, end_date: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setQuarterDialogOpen(false);
                    resetQuarterForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={editingQuarter ? handleEditQuarter : handleCreateQuarter}>
                    {editingQuarter ? 'Atualizar' : 'Salvar Quarter'}
                  </Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : !selectedCompanyForForm ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                Selecione uma empresa para visualizar os quarters e check-ins.
              </p>
            </CardContent>
          </Card>
        ) : quarters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum quarter cadastrado ainda.<br />
                Crie o primeiro quarter para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {quarters.map((quarter) => (
              <Card key={quarter.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleQuarter(quarter.id)}
                        className="p-0 h-6 w-6"
                      >
                        {expandedQuarters.has(quarter.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      <div>
                        <CardTitle className="text-xl">{quarter.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            const startParts = quarter.start_date.split('-').map(Number);
                            const endParts = quarter.end_date.split('-').map(Number);
                            const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
                            const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
                            return `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`;
                          })()}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCreateCheckInDialog(quarter)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Check-in
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditQuarterDialog(quarter)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteQuarterDialog(quarter)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {expandedQuarters.has(quarter.id) && (
                  <CardContent>
                    {!checkIns[quarter.id] || checkIns[quarter.id].length === 0 ? (
                      <p className="text-muted-foreground text-sm">Nenhum check-in cadastrado</p>
                    ) : (
                      <div className="space-y-2">
                        {checkIns[quarter.id].map((checkIn) => (
                          <div
                            key={checkIn.id}
                            className="flex items-start justify-between p-3 rounded-lg border bg-card"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {(() => {
                                  const dateStr = checkIn.checkin_date || checkIn.occurred_at;
                                  if (!dateStr) return '-';
                                  const dateParts = dateStr.split('-').map(Number);
                                  const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                                  return format(date, 'dd/MM/yyyy', { locale: ptBR });
                                })()}
                              </p>
                              {checkIn.note && (
                                <p className="text-sm text-muted-foreground mt-1">{checkIn.note}</p>
                              )}
                            </div>
                            {isAdmin && (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCheckInDialog(checkIn, quarter)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteCheckInDialog(checkIn)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Check-in Dialog */}
        <Dialog open={checkInDialogOpen} onOpenChange={(open) => {
          setCheckInDialogOpen(open);
          if (!open) resetCheckInForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCheckIn ? 'Editar Check-in' : 'Novo Check-in'}
                {selectedQuarter && <span className="text-sm font-normal text-muted-foreground ml-2">- {selectedQuarter.name}</span>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Data do Check-in *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !checkInFormData.occurred_at && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkInFormData.occurred_at ? format(checkInFormData.occurred_at, 'dd/MM/yyyy') : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkInFormData.occurred_at}
                      onSelect={(date) => setCheckInFormData({ ...checkInFormData, occurred_at: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="note">Observações</Label>
                <Textarea
                  id="note"
                  value={checkInFormData.note}
                  onChange={(e) => setCheckInFormData({ ...checkInFormData, note: e.target.value })}
                  placeholder="Adicione observações sobre este check-in..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setCheckInDialogOpen(false);
                resetCheckInForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={editingCheckIn ? handleEditCheckIn : handleCreateCheckIn}>
                {editingCheckIn ? 'Atualizar' : 'Salvar Check-in'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Quarter Dialog */}
        <AlertDialog open={!!deleteQuarterDialog} onOpenChange={(open) => !open && setDeleteQuarterDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Quarter</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o quarter "{deleteQuarterDialog?.name}"? 
                Todos os check-ins associados também serão excluídos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteQuarterDialog && handleDeleteQuarter(deleteQuarterDialog)}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Check-in Dialog */}
        <AlertDialog open={!!deleteCheckInDialog} onOpenChange={(open) => !open && setDeleteCheckInDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Check-in</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este check-in? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteCheckInDialog && handleDeleteCheckIn(deleteCheckInDialog)}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
