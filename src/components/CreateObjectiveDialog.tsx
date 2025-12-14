import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Quarter {
  id: string;
  name: string;
}

interface KeyResultForm {
  tempId: string;
  title: string;
  type: string;
  direction: string;
  unit: string;
  user_id: string;
}

interface CreateObjectiveDialogProps {
  onSuccess: () => void;
  currentQuarterId: string;
  currentCompanyId: string;
}

export function CreateObjectiveDialog({ onSuccess, currentQuarterId, currentCompanyId }: CreateObjectiveDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Companies and users
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [existingTitles, setExistingTitles] = useState<string[]>([]);

  // Form fields
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompanyId);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedQuarterId, setSelectedQuarterId] = useState(currentQuarterId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Key Results
  const [keyResults, setKeyResults] = useState<KeyResultForm[]>([]);

  useEffect(() => {
    if (open) {
      loadCompanies();
      loadQuarters();
      loadExistingTitles();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadUsers(selectedCompanyId);
    } else {
      setUsers([]);
      setSelectedUserId('');
    }
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as empresas',
        variant: 'destructive',
      });
    }
  };

  const loadUsers = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive',
      });
    }
  };

  const loadQuarters = async () => {
    try {
      const { data, error } = await supabase
        .from('quarters')
        .select('id, name')
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setQuarters(data || []);
    } catch (error) {
      console.error('Erro ao carregar trimestres:', error);
    }
  };

  const loadExistingTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('objectives')
        .select('title')
        .order('title');

      if (error) throw error;
      
      // Extrair títulos únicos
      const uniqueTitles = [...new Set(data?.map(obj => obj.title) || [])];
      setExistingTitles(uniqueTitles);
    } catch (error) {
      console.error('Erro ao carregar títulos existentes:', error);
    }
  };

  const addKeyResult = () => {
    // Validar se o responsável foi selecionado
    if (!selectedUserId) {
      alert('Por favor, selecione o Responsável antes de adicionar Key Results.');
      return;
    }

    const newKR: KeyResultForm = {
      tempId: `temp-${Date.now()}`,
      title: '',
      type: 'number',
      direction: 'increase',
      unit: '',
      user_id: selectedUserId,
    };
    setKeyResults([...keyResults, newKR]);
  };

  const removeKeyResult = (tempId: string) => {
    setKeyResults(keyResults.filter(kr => kr.tempId !== tempId));
  };

  const updateKeyResult = (tempId: string, field: keyof KeyResultForm, value: string) => {
    setKeyResults(keyResults.map(kr => 
      kr.tempId === tempId ? { ...kr, [field]: value } : kr
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !selectedCompanyId || !selectedUserId || !selectedQuarterId) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create objective
      const { data: objectiveData, error: objectiveError } = await supabase
        .from('objectives')
        .insert({
          title,
          description: description || null,
          status: 'not_started',
          weight: 1,
          company_id: selectedCompanyId,
          user_id: selectedUserId,
          quarter_id: selectedQuarterId,
          created_by: user?.id,
          archived: false,
        })
        .select()
        .single();

      if (objectiveError) throw objectiveError;

      // Create key results if any
      if (keyResults.length > 0) {
        const krInserts = keyResults
          .filter(kr => kr.title.trim() !== '')
          .map(kr => ({
            objective_id: objectiveData.id,
            title: kr.title,
            type: kr.type,
            direction: kr.direction,
            unit: kr.unit || null,
            user_id: kr.user_id || selectedUserId,
            company_id: selectedCompanyId,
            quarter_id: selectedQuarterId,
            created_by: user?.id,
            current: 0,
            baseline: 0,
            floor_value: 0,
            target: 0,
            weight: 1,
          }));

        if (krInserts.length > 0) {
          const { error: krError } = await supabase
            .from('key_results')
            .insert(krInserts);

          if (krError) throw krError;
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Objetivo criado com sucesso!',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setKeyResults([]);
      setSelectedUserId('');
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar objetivo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o objetivo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Objetivo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Criar Novo Objetivo
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do objetivo e adicione os Key Results (OKRs)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Empresa e Usuário */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company" className="bg-background">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Responsável *</Label>
              <Select 
                value={selectedUserId} 
                onValueChange={setSelectedUserId}
                disabled={!selectedCompanyId}
              >
                <SelectTrigger id="user" className="bg-background">
                  <SelectValue placeholder={selectedCompanyId ? "Selecione o usuário" : "Selecione uma empresa primeiro"} />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quarter */}
          <div className="space-y-2">
            <Label htmlFor="quarter">Trimestre *</Label>
            <Select value={selectedQuarterId} onValueChange={setSelectedQuarterId}>
              <SelectTrigger id="quarter" className="bg-background">
                <SelectValue placeholder="Selecione o trimestre" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {quarters.map(q => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título e Descrição */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4 mb-2">
              <Label htmlFor="title">Título do Objetivo *</Label>
              {existingTitles.length > 0 && (
                <ScrollArea className="h-8 flex-1">
                  <div className="flex gap-1 flex-wrap">
                    {existingTitles.map((existingTitle, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs whitespace-nowrap cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => setTitle(existingTitle)}
                      >
                        {existingTitle}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Aumentar a satisfação dos clientes"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo..."
              rows={3}
            />
          </div>

          {/* Key Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Key Results (OKRs)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addKeyResult}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar KR
              </Button>
            </div>

            {keyResults.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhum Key Result adicionado. Clique em "Adicionar KR" para criar.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {keyResults.map((kr, index) => (
                  <Card key={kr.tempId} className="border-2">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Key Result #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKeyResult(kr.tempId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Título *</Label>
                        <Input
                          value={kr.title}
                          onChange={(e) => updateKeyResult(kr.tempId, 'title', e.target.value)}
                          placeholder="Ex: Reduzir tempo de resposta"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select 
                            value={kr.type} 
                            onValueChange={(v) => updateKeyResult(kr.tempId, 'type', v)}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="percentage">Percentual</SelectItem>
                              <SelectItem value="currency">Moeda</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Direção</Label>
                          <Select 
                            value={kr.direction} 
                            onValueChange={(v) => updateKeyResult(kr.tempId, 'direction', v)}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="increase">Aumentar</SelectItem>
                              <SelectItem value="decrease">Diminuir</SelectItem>
                              <SelectItem value="maintain">Manter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Input
                            value={kr.unit}
                            onChange={(e) => updateKeyResult(kr.tempId, 'unit', e.target.value)}
                            placeholder="Ex: dias, %"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Responsável pelo KR</Label>
                        <Select 
                          value={kr.user_id} 
                          onValueChange={(v) => updateKeyResult(kr.tempId, 'user_id', v)}
                          disabled={!selectedCompanyId}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Usar responsável do objetivo" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {users.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Objetivo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
