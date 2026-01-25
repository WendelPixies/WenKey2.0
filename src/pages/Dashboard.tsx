import { useMemo, type ReactNode, type CSSProperties } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Layout } from '@/components/Layout';
import { CircularProgress } from '@/components/CircularProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, TrendingUp, Award, Trophy } from 'lucide-react';
import { toTitleCase } from '@/lib/utils';
import { ActiveQuarterInfo } from '@/components/ActiveQuarterInfo';
import { useDashboardData, UserRanking } from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();

  // Use the new hook for all data fetching and caching
  const { data, isLoading } = useDashboardData();

  const getProgressStyle = (pct: number): ProgressStyle => ({
    '--progress-color': getPerformanceColor(pct),
  });

  const topThreeRankings = useMemo(() =>
    data?.metrics.userRankings.slice(0, 3) || [],
    [data?.metrics.userRankings]
  );

  // 1. Not Logged In
  if (!user) {
    return (
      <Layout>
        <div className="py-24 text-center text-muted-foreground">
          Faça login para visualizar o dashboard.
        </div>
      </Layout>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          <p>Carregando dashboard...</p>
        </div>
      </Layout>
    );
  }

  // 3. No Company Selected or No Data
  if (!selectedCompanyId || !data || !data.active_quarter) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-4">
          {!selectedCompanyId ? (
            <>
              <Target className="w-12 h-12 text-muted-foreground/50" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Nenhuma empresa selecionada</h3>
                <p>Utilize o menu lateral para selecionar uma empresa.</p>
              </div>
            </>
          ) : (
            <p>Não foi possível localizar quarters para esta empresa.</p>
          )}
        </div>
      </Layout>
    );
  }

  const { metrics, userProfile, active_quarter } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{toTitleCase('Dashboard')}</p>
            <h1 className="text-3xl font-bold tracking-tight text-black">{toTitleCase('Bem-vindo')}, {toTitleCase(userProfile?.full_name ?? 'Usuário')}</h1>
            <p className="text-muted-foreground">
              {toTitleCase('Acompanhe a evolução dos objetivos e resultados-chave da empresa.')}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border w-full h-full">
            <ActiveQuarterInfo quarter={active_quarter} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={toTitleCase('Objetivos Ativos')}
            icon={<Target className="h-5 w-5" />}
            value={metrics.activeObjectivesCount}
            description={toTitleCase('Objetivos acompanhados neste quarter')}
          />
          <KpiCard
            title={toTitleCase('OKRs Ativos')}
            icon={<Calendar className="h-5 w-5" />}
            value={metrics.activeOKRsCount}
            description={toTitleCase('Key Results com acompanhamento')}
          />
          <KpiCard
            title={toTitleCase('Média do Quarter')}
            icon={<TrendingUp className="h-5 w-5" />}
            value={`${metrics.currentQuarterProgress}%`}
            description={toTitleCase('Progresso consolidado do quarter')}
          />
          <KpiCard
            title={toTitleCase('Colaboradores ranqueados')}
            icon={<Award className="h-5 w-5" />}
            value={metrics.userRankings.length}
            description={toTitleCase('Participantes com resultados enviados')}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progresso do Quarter Atual
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Percentual consolidado considerando todos os check-ins.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <CircularProgress percentage={metrics.currentQuarterProgress} size={220} strokeWidth={14} />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Resultado consolidado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Ranking do Quarter
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Colaboradores com melhor desempenho no quarter atual.
              </p>
            </CardHeader>
            <CardContent className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {topThreeRankings.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum resultado disponível.</p>
              ) : (
                <div className="space-y-4">
                  {topThreeRankings.map(ranking => (
                    <div key={ranking.user_id} className="flex items-center justify-between rounded-2xl border p-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-normal px-2 py-1 flex justify-center text-sm">
                          #{ranking.rank}
                        </Badge>
                        <Avatar className="h-12 w-12">
                          {ranking.avatar_url ? (
                            <AvatarImage src={ranking.avatar_url} alt={ranking.full_name} />
                          ) : (
                            <AvatarFallback>{getInitials(ranking.full_name)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-base font-normal leading-tight">{ranking.full_name}</p>
                          <p className="text-sm text-muted-foreground">{ranking.sector ?? 'Sem setor'}</p>
                        </div>
                      </div>
                      <span className="text-base font-normal">{ranking.result_pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RankingList
            title={toTitleCase('Ranking completo')}
            icon={<Trophy className="h-4 w-4" />}
            emptyMessage={toTitleCase('Nenhum colaborador posicionado')}
            data={metrics.userRankings}
          />
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {toTitleCase('Atingimento por Objetivo')}
                </CardTitle>
                <p className="text-base text-muted-foreground">
                  {toTitleCase('Percentual médio de atingimento por objetivo na empresa.')}
                </p>
              </CardHeader>
              <CardContent className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {metrics.objectiveRankings.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nenhum objetivo disponível.</p>
                ) : (
                  <div className="space-y-4">
                    {metrics.objectiveRankings
                      // Sorted in Hook
                      .map((objective, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-normal">{toTitleCase(objective.objective_title)}</span>
                            <span className="text-base font-normal text-muted-foreground">{objective.result_pct}%</span>
                          </div>
                          <Progress
                            value={objective.result_pct}
                            className="h-2"
                            style={getProgressStyle(objective.result_pct)}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {toTitleCase('Quantidade de OKRs por Objetivo')}
                </CardTitle>
                <p className="text-base text-muted-foreground">
                  {toTitleCase('Número de Key Results associados a cada objetivo.')}
                </p>
              </CardHeader>
              <CardContent className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {metrics.objectiveRankings.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nenhum objetivo disponível.</p>
                ) : (
                  <div className="space-y-3">
                    {metrics.objectiveRankings
                      // Sort differently for this view
                      .sort((a, b) => b.kr_count - a.kr_count)
                      .map((objective, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                          <span className="text-base font-normal">{toTitleCase(objective.objective_title)}</span>
                          <span className="text-base font-normal text-primary">
                            {objective.kr_count}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {toTitleCase('OKRs em Destaque')}
            </CardTitle>
            <p className="text-base text-muted-foreground">{toTitleCase('Key Results ordenados pelo percentual de atingimento.')}</p>
          </CardHeader>
          <CardContent className="h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {metrics.okrRankings.length === 0 ? (
              <p className="text-center text-muted-foreground">Nenhum dado cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {metrics.okrRankings.map((okr, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {okr.code && <span className="text-xs text-muted-foreground">{okr.code}</span>}
                        <span className="text-base font-normal">
                          {toTitleCase(okr.title)}
                          {okr.owner_name && (
                            <span className="ml-2 text-sm text-muted-foreground font-normal inline-flex items-center gap-1.5 align-middle">
                              -
                              <Avatar className="h-4 w-4">
                                {okr.owner_avatar_url ? (
                                  <AvatarImage src={okr.owner_avatar_url} alt={okr.owner_name || ''} />
                                ) : (
                                  <AvatarFallback className="text-[8px]">{getInitials(okr.owner_name || '')}</AvatarFallback>
                                )}
                              </Avatar>
                              {toTitleCase(okr.owner_name)} ({toTitleCase(okr.owner_sector ?? 'Sem setor')})
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-base font-normal">{okr.result_pct}%</span>
                    </div>
                    <Progress
                      value={okr.result_pct}
                      className="h-2"
                      style={getProgressStyle(okr.result_pct)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

type ProgressStyle = CSSProperties & {
  '--progress-color'?: string;
};

const getInitials = (name: string) => {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getPerformanceColor = (pct: number) => {
  if (pct <= 20) return '#FF0000';
  if (pct <= 40) return '#FF6600';
  if (pct <= 60) return '#FFCC00';
  if (pct <= 80) return '#99CC00';
  if (pct <= 100) return '#00CC00';
  return '#009900';
};

function KpiCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <p className="text-base text-black">{title}</p>
          <h3 className="text-2xl font-normal text-black">{value}</h3>
        </div>
        <div className="rounded-full bg-muted p-3 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-black">{description}</p>
      </CardContent>
    </Card>
  );
}

function RankingList({
  title,
  icon,
  data,
  emptyMessage,
}: {
  title: string;
  icon: ReactNode;
  data: UserRanking[];
  emptyMessage: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {data.map(ranking => (
              <div key={ranking.user_id} className="flex items-center justify-between rounded-xl border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-normal px-1.5 h-6 min-w-[2rem] flex justify-center text-[11px]">
                    #{ranking.rank}
                  </Badge>
                  <Avatar className="h-8 w-8">
                    {ranking.avatar_url ? (
                      <AvatarImage src={ranking.avatar_url} alt={ranking.full_name} />
                    ) : (
                      <AvatarFallback className="text-[10px]">{getInitials(ranking.full_name)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-base font-normal leading-tight text-black">{toTitleCase(ranking.full_name)}</p>
                    <p className="text-sm text-black">{toTitleCase(ranking.sector ?? 'Sem setor')}</p>
                  </div>
                </div>
                <span className="text-base font-normal">{ranking.result_pct}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
