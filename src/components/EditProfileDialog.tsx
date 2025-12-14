import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  onProfileUpdated: () => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdated }: EditProfileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarPreview(profile.avatar_url || '');
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });

      onProfileUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarPreview} alt={fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Alterar foto</span>
                </div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Digite seu nome completo"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
