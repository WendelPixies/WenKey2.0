import { useEffect, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface EditKRDialogProps {
  krId: string;
  companyId: string;
  onSuccess: () => void;
  trigger?: ReactNode;
}

interface Profile {
  id: string;
  full_name: string;
}

interface KRForm {
  title: string;
  type: string;
  direction: string;
  unit: string;
  user_id: string;
  code: string;
}

export function EditKRDialog({ krId, companyId, onSuccess, trigger }: EditKRDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [form, setForm] = useState<KRForm>({
    title: '',
    type: 'number',
    direction: 'increase',
    unit: '',
    user_id: '',
    code: '',
  });

  useEffect(() => {
    if (open) {
      loadUsers();
      loadKeyResult();
    }
  }, [open, krId, companyId]);

  const loadUsers = async () => {
    const { data: companyMembers, error } = await supabase
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId);

    if (error) {
      toast.error('Erro ao carregar responsáveis');
      return;
    }

    if (companyMembers && companyMembers.length > 0) {
      const userIds = companyMembers.map((cm) => cm.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
        .order('full_name');

      if (profilesError) {
        toast.error('Erro ao carregar responsáveis');
        return;
      }

      if (profiles) {
        setUsers(profiles);
      }
    }
  };

  const loadKeyResult = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('key_results')
      .select('title, type, direction, unit, user_id, code')
      .eq('id', krId)
      .single();

    if (error || !data) {
      toast.error('Não foi possível carregar o Key Result');
      setLoading(false);
      return;
    }

    setForm({
      title: data.title ?? '',
      type: data.type ?? 'number',
      direction: data.direction ?? 'increase',
      unit: data.unit ?? '',
      user_id: data.user_id ?? '',
      code: data.code ?? '',
    });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Preencha o título do Key Result');
      return;
    }

    if (!form.user_id) {
      toast.error('Selecione o responsável');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('key_results')
        .update({
          title: form.title.trim(),
          type: form.type,
          direction: form.direction,
          unit: form.unit || null,
          user_id: form.user_id,
          code: form.code || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', krId);

      if (error) throw error;

      toast.success('Key Result atualizado com sucesso');
      onSuccess();
      setOpen(false);
    } catch (err: any) {
      console.error('Erro ao atualizar Key Result:', err);
      toast.error(err.message || 'Erro ao atualizar Key Result');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Key Result</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kr-title">Título *</Label>
            <Input
              id="kr-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título do KR"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kr-code">Código (opcional)</Label>
            <Input
              id="kr-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Ex: KR-01"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="percentage">Porcentagem</SelectItem>
                  <SelectItem value="currency">Moeda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direção</Label>
              <Select
                value={form.direction}
                onValueChange={(value) => setForm({ ...form, direction: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="increase">Aumentar</SelectItem>
                  <SelectItem value="decrease">Diminuir</SelectItem>
                  <SelectItem value="maintain">Manter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unidade</Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Ex: %, dias"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável *</Label>
            <Select
              value={form.user_id}
              onValueChange={(value) => setForm({ ...form, user_id: value })}
              disabled={loading}
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

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || loading}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
