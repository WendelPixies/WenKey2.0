import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface EditObjectiveDialogProps {
  objective: {
    id: string;
    title: string;
    description: string | null;
    user_id: string;
    company_id: string;
    quarter_id: string;
  };
  onSuccess: () => void;
}

interface Profile {
  id: string;
  full_name: string;
}

export function EditObjectiveDialog({ objective, onSuccess }: EditObjectiveDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description || '');
  const [selectedUserId, setSelectedUserId] = useState(objective.user_id);

  useEffect(() => {
    if (open) {
      loadUsers();
      // Reset form with current objective data
      setTitle(objective.title);
      setDescription(objective.description || '');
      setSelectedUserId(objective.user_id);
    }
  }, [open, objective]);

  const loadUsers = async () => {
    try {
      const { data: companyMembers } = await supabase
        .from('company_members')
        .select('user_id')
        .eq('company_id', objective.company_id);

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
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar lista de usuários');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('O título do objetivo é obrigatório');
      return;
    }

    if (!selectedUserId) {
      toast.error('Selecione o responsável pelo objetivo');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('objectives')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          user_id: selectedUserId,
        })
        .eq('id', objective.id);

      if (error) throw error;

      toast.success('Objetivo atualizado com sucesso!');
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao atualizar objetivo:', error);
      toast.error('Erro ao atualizar objetivo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Objetivo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Objetivo *</Label>
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
                placeholder="Descreva o objetivo com mais detalhes..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Responsável *</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="user" className="bg-background">
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

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
