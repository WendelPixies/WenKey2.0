import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Target, Loader2 } from 'lucide-react';


export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;

      toast.success('Conta criada! Confirme seu email. Após a confirmação, um administrador precisará ativar sua conta.');
      navigate(`/confirm-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = (resetEmail || formData.email).trim();
    if (!targetEmail) {
      toast.error('Informe o email utilizado no cadastro.');
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message || 'Não foi possível enviar o email.');
    } else {
      toast.success('Enviamos um link para redefinir sua senha.');
      setShowResetForm(false);
      setResetEmail('');
    }

    setResetLoading(false);
  };

  const toggleResetForm = () => {
    if (!showResetForm && !resetEmail) {
      setResetEmail(formData.email);
    }
    setShowResetForm((prev) => !prev);
  };

  useEffect(() => {
    document.title = 'Wenkey - Entrar ou Cadastrar';
  }, []);

  useEffect(() => {
    if (activeTab !== 'signin') {
      setShowResetForm(false);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Coluna esquerda: formulário */}
      <div className="flex items-center justify-center p-8 bg-gradient-subtle">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8 gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Wenkey
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo</CardTitle>
              <CardDescription>
                Gerencie seus OKRs de forma eficiente e organizada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Senha</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                  </form>
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <button
                      type="button"
                      className="text-sm text-primary underline underline-offset-4"
                      onClick={toggleResetForm}
                    >
                      Esqueceu a senha?
                    </button>
                    {showResetForm && (
                      <form onSubmit={handlePasswordReset} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email para recuperação</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="Informe seu email"
                            value={resetEmail}
                            onChange={(event) => setResetEmail(event.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" variant="secondary" disabled={resetLoading}>
                          {resetLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando link...
                            </>
                          ) : (
                            'Enviar link de redefinição'
                          )}
                        </Button>
                      </form>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="João Silva"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Coluna direita: imagem de escritório com overlay azul */}
      <div className="relative hidden md:block overflow-hidden">
        <img
          src="/images/office.jpg"
          alt="Escritório moderno"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <div className="max-w-md text-center text-white relative z-10 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <h2 className="text-4xl font-bold mb-4 tracking-tight drop-shadow-2xl">Bem-vindo ao Wenkey</h2>
            <p className="text-lg text-white/90 font-medium leading-relaxed">Acompanhe metas, quarters e resultados em uma plataforma simples e poderosa.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
