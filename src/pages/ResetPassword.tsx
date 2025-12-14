import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';

type ViewState = 'checking' | 'ready' | 'missing';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Wenkey - Redefinir senha';

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setViewState('ready');
      } else {
        setViewState('missing');
      }
    });
  }, []);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password || password.length < 6) {
      toast.error('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas precisam ser iguais.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    toast.success('Senha atualizada! Faça login novamente.');
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            Escolha uma nova senha segura para acessar o Wenkey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewState === 'checking' && (
            <div className="text-center py-6 text-muted-foreground">Validando o link...</div>
          )}

          {viewState === 'missing' && (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Este link de recuperação não é válido ou já foi usado. Solicite um novo link e tente novamente.
              </p>
              <Button onClick={() => navigate('/auth')}>Voltar ao login</Button>
            </div>
          )}

          {viewState === 'ready' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Sua nova senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirme a nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar senha'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
