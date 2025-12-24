import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Mail } from 'lucide-react';
import { useEffect } from 'react';

export default function PendingApproval() {
    const { profile, signOut, refreshProfile } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (profile?.is_active) {
            navigate('/');
        }
    }, [profile, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-8 h-8 text-amber-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
                    <CardDescription>
                        Sua conta foi criada com sucesso, mas ainda precisa ser ativada por um administrador.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Mail className="w-4 h-4" />
                            <span>{profile?.email}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Você receberá um e-mail assim que sua conta for aprovada. Por favor, aguarde a validação do administrador.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => refreshProfile()}
                        >
                            Já fui aprovado? Verificar agora
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-500"
                            onClick={() => signOut()}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
