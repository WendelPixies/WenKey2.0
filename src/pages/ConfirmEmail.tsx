import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MailCheck, Loader2 } from 'lucide-react';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
  const [resending, setResending] = useState(false);

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
      toast.success('Link de confirmação reenviado!');
    }

    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white">
            <MailCheck className="w-8 h-8" />
          </div>
          <CardTitle>Confirme seu email</CardTitle>
          <CardDescription className="text-base">
            Enviamos um link para <strong>{email || 'seu email'}</strong>. Clique no link para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleResend} className="space-y-3">
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
            <Button type="submit" className="w-full" disabled={resending}>
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                'Reenviar link de confirmação'
              )}
            </Button>
          </form>
          <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
            Voltar para o login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
