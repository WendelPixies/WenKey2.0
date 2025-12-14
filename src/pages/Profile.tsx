import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Profile() {
  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Perfil</h1>
        <Card>
          <CardHeader>
            <CardTitle>Suas Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Página de perfil em desenvolvimento</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}