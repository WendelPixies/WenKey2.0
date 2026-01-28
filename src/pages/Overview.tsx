import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CircularProgress } from '@/components/CircularProgress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Trophy } from 'lucide-react';

interface Quarter {
  id: string;
  name: string;
  company_id: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserRanking {
  rank: number;
  user_id: string;
  full_name: string;
  position: string | null;
  result_percent: number;
}

export default function Overview() {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();
  const { role, isAdmin, loading: roleLoading } = useUserRole();
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [userCompanyId, setUserCompanyId] = useState<string>('');

  useEffect(() => {
    if (!roleLoading && user) {
      initializePage();
    }
  }, [roleLoading, user, isAdmin]);

  useEffect(() => {
    if (selectedCompany && selectedQuarter) {
      loadRankings();
    }
  }, [selectedCompany, selectedQuarter]);

  useEffect(() => {
    if (roleLoading) return;

    if (selectedCompanyId && selectedCompany !== selectedCompanyId) {
      setSelectedCompany(selectedCompanyId);
      loadQuarters(selectedCompanyId);
    } else if (!selectedCompanyId && selectedCompany) {
      setSelectedCompany('');
      setSelectedQuarter('');
      setQuarters([]);
      setRankings([]);
    }
  }, [selectedCompanyId, selectedCompany, roleLoading]);

  const initializePage = async () => {
    try {
      setLoading(true);

      // Buscar dados do perfil do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profileData?.company_id) {
        setUserCompanyId(profileData.company_id);
      }

      if (isAdmin) {
        // Admin: carregar todas as empresas ativas
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (companiesData && companiesData.length > 0) {
          setCompanies(companiesData);
          // Selecionar a primeira empresa ou a empresa do admin
          const defaultCompany = profileData?.company_id || companiesData[0].id;
          setSelectedCompany(defaultCompany);
          await loadQuarters(defaultCompany);
        }
      } else {
        // User: usar apenas a empresa do usuário
        if (profileData?.company_id) {
          setSelectedCompany(profileData.company_id);
          await loadQuarters(profileData.company_id);
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar página:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuarters = async (companyId: string) => {
    const { data: quartersData } = await supabase
      .from('quarters')
      .select('id, name, company_id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (quartersData && quartersData.length > 0) {
      setQuarters(quartersData);
      setSelectedQuarter(quartersData[0].id);
    } else {
      setQuarters([]);
      setSelectedQuarter('');
    }
  };

  const loadRankings = async () => {
    if (!selectedCompany || !selectedQuarter) return;

    try {
      const { data: resultsData, error } = await supabase
        .from('quarter_results')
        .select('user_id, result_percent')
        .eq('company_id', selectedCompany)
        .eq('quarter_id', selectedQuarter)
        .order('result_percent', { ascending: false });

      if (error) {
        console.error('Erro ao carregar rankings:', error);
        return;
      }

      if (!resultsData || resultsData.length === 0) {
        setRankings([]);
        return;
      }

      const userIds = Array.from(new Set(resultsData.map(item => item.user_id)));

      if (userIds.length === 0) {
        setRankings([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, is_active')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao carregar perfis para o ranking:', profilesError);
        return;
      }

      const profileMap = new Map(
        (profilesData || [])
          .filter(profile => profile.is_active)
          .map(profile => [profile.id, profile])
      );

      const rankings: UserRanking[] = [];
      resultsData.forEach(result => {
        const profile = profileMap.get(result.user_id);
        if (!profile) return;

        rankings.push({
          rank: rankings.length + 1,
          user_id: result.user_id,
          full_name: profile.full_name,
          position: profile.position,
          result_percent: result.result_percent || 0
        });
      });

      setRankings(rankings);
    } catch (error) {
      console.error('Erro ao processar rankings:', error);
    }
  };

  const handleCompanyChange = async (companyId: string) => {
    setSelectedCompany(companyId);
    await loadQuarters(companyId);
  };

  const getRankingLabel = (rank: number): string => {
    return `${rank}º LUGAR`;
  };

  if (roleLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground">
            Ranking de desempenho dos colaboradores
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {/* Filtro de Empresa - apenas para Admin */}
              {isAdmin && (
                <div className="flex-1 min-w-[200px]">
                  <Label>Empresa</Label>
                  <Select
                    value={selectedCompany}
                    onValueChange={handleCompanyChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro de Quarter */}
              <div className="flex-1 min-w-[200px]">
                <Label>Quarter</Label>
                <Select
                  value={selectedQuarter}
                  onValueChange={setSelectedQuarter}
                  disabled={!selectedCompany || quarters.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters.map((quarter) => (
                      <SelectItem key={quarter.id} value={quarter.id}>
                        {quarter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking */}
        {selectedCompany && selectedQuarter ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Ranking de Desempenho
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {rankings.map((ranking) => (
                    <Card key={ranking.user_id} className="overflow-hidden">
                      <CardHeader className="pb-3 bg-muted/50">
                        <CardTitle className="text-center text-lg font-bold">
                          {getRankingLabel(ranking.rank)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 pb-6 flex flex-col items-center space-y-4">
                        <CircularProgress
                          percentage={ranking.result_percent}
                          size={140}
                          strokeWidth={12}
                        />
                        <div className="text-center space-y-1">
                          <p className="font-semibold text-base capitalize">
                            {ranking.full_name.toLowerCase()}
                          </p>
                          {ranking.position && (
                            <p className="text-sm text-muted-foreground capitalize">
                              {ranking.position.toLowerCase()}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ainda não há resultados consolidados para este quarter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione uma empresa e um quarter para visualizar o ranking.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
