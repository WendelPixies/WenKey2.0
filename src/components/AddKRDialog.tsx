import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

interface AddKRDialogProps {
  objectiveId: string;
  companyId: string;
  quarterId: string;
  onSuccess: () => void;
}

interface Profile {
  id: string;
  full_name: string;
}

interface KeyResultForm {
  id: string;
  title: string;
  type: string;
  direction: string;
  unit: string;
  user_id: string;
}

export function AddKRDialog({ objectiveId, companyId, quarterId, onSuccess }: AddKRDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResultForm[]>([]);

  useEffect(() => {
    if (open && companyId) {
      loadUsers();
    }
  }, [open, companyId]);

  const loadUsers = async () => {
    const { data: companyMembers } = await supabase
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId);

    if (companyMembers && companyMembers.length > 0) {
      const userIds = companyMembers.map((cm) => cm.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .order('full_name');

      if (profiles) {
        setUsers(profiles);
      }
    }
  };

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      {
        id: crypto.randomUUID(),
        title: '',
        type: 'number',
        direction: 'increase',
        unit: '',
        user_id: '',
      },
    ]);
  };

  const removeKeyResult = (id: string) => {
    setKeyResults(keyResults.filter((kr) => kr.id !== id));
  };

  const updateKeyResult = (id: string, field: keyof KeyResultForm, value: any) => {
    setKeyResults(
      keyResults.map((kr) => (kr.id === id ? { ...kr, [field]: value } : kr))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (keyResults.length === 0) {
      toast.error('Adicione pelo menos um Key Result');
      return;
    }

    // Validar campos obrigatórios
    for (const kr of keyResults) {
      if (!kr.title.trim()) {
        toast.error('Preencha o título de todos os Key Results');
        return;
      }
      if (!kr.user_id) {
        toast.error('Selecione o responsável para todos os Key Results');
        return;
      }
    }

    setLoading(true);

    try {
      // Inserir todos os KRs
      const krsToInsert = keyResults.map((kr) => ({
        objective_id: objectiveId,
        title: kr.title,
        type: kr.type,
        direction: kr.direction,
        unit: kr.unit || null,
        user_id: kr.user_id,
        company_id: companyId,
        quarter_id: quarterId,
        created_by: user?.id,
        current: 0,
        baseline: 0,
        floor_value: 0,
        target: 0,
        weight: 1,
      }));

      const { error: krError } = await supabase
        .from('key_results')
        .insert(krsToInsert);

      if (krError) throw krError;

      toast.success('Key Results adicionados com sucesso!');
      setOpen(false);
      setKeyResults([]);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao adicionar Key Results:', error);
      toast.error('Erro ao adicionar Key Results: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar KR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Key Results</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Key Results (OKRs)</h3>
              <Button type="button" onClick={addKeyResult} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar KR
              </Button>
            </div>

            {keyResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum Key Result adicionado. Clique em "Adicionar KR" para criar.
              </div>
            ) : (
              <div className="space-y-4">
                {keyResults.map((kr, index) => (
                  <div key={kr.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Key Result #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKeyResult(kr.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título *</Label>
                        <Input
                          value={kr.title}
                          onChange={(e) => updateKeyResult(kr.id, 'title', e.target.value)}
                          placeholder="Ex: Reduzir tempo de resposta"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={kr.type}
                          onValueChange={(value) => updateKeyResult(kr.id, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="percentage">Porcentagem</SelectItem>
                            <SelectItem value="currency">Moeda</SelectItem>
                            <SelectItem value="date">Data</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Direção</Label>
                        <Select
                          value={kr.direction}
                          onValueChange={(value) => updateKeyResult(kr.id, 'direction', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="increase">Aumentar</SelectItem>
                            <SelectItem value="decrease">Diminuir</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Unidade</Label>
                        <Input
                          value={kr.unit}
                          onChange={(e) => updateKeyResult(kr.id, 'unit', e.target.value)}
                          placeholder="Ex: dias, %"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Responsável pelo KR *</Label>
                      <Select
                        value={kr.user_id}
                        onValueChange={(value) => updateKeyResult(kr.id, 'user_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || keyResults.length === 0}>
              {loading ? 'Salvando...' : 'Adicionar Key Results'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
