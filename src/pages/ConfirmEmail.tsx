import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MailCheck, Loader2, KeyRound } from 'lucide-react';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
  const [token, setToken] = useState('');
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    document.title = 'Wenkey - Confirme seu email';
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Informe o email utilizado no cadastro.');
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Código de confirmação reenviado!');
    }

    setResending(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !token) {
      toast.error('Preencha o email e o código recebido.');
      return;
    }

    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) throw error;

      toast.success('Email confirmado com sucesso!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar código');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
      <Card className="w-full max-w-lg shadow-xl border-none">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-lg">
            <MailCheck className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Verifique seu email</CardTitle>
          <CardDescription className="text-base">
            Enviamos um código de confirmação para <strong>{email || 'seu email'}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Email</Label>
              <Input
                id="confirm-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Código de 6 dígitos</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="000000"
                  className="pl-10 text-center tracking-[0.5em] font-mono text-lg"
                  maxLength={6}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={verifying}>
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Confirmar Código'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Ou</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Não recebeu o código? Reenviar'
              )}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/auth')}>
              Voltar para o login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
