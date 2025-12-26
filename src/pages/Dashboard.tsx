import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Layout } from '@/components/Layout';
import { CircularProgress } from '@/components/CircularProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, TrendingUp, Award, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppState {
  company_id: string;
  user_id: string;
  quarters: Quarter[];
  active_quarter: Quarter | null;
}

interface Quarter {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  company_id: string;
  full_name: string;
  sector: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface QuarterPerformance {
  quarter_id: string;
  quarter_name: string;
  result_pct: number;
  is_active: boolean;
  status: 'current' | 'finished' | 'future';
}

interface UserRanking {
  rank: number;
  user_id: string;
  full_name: string;
  sector: string | null;
  avatar_url: string | null;
  result_pct: number;
}

interface ObjectiveRanking {
  objective_title: string;
  result_pct: number;
}

interface OKRRanking {
  code: string | null;
  title: string;
  result_pct: number;
  owner_name: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();
  const { role, loading: roleLoading } = useUserRole();

  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [activeObjectivesCount, setActiveObjectivesCount] = useState(0);
  const [activeOKRsCount, setActiveOKRsCount] = useState(0);
  const [currentQuarterProgress, setCurrentQuarterProgress] = useState(0);

  const [quarterPerformance, setQuarterPerformance] = useState<QuarterPerformance[]>([]);
  const [userRankings, setUserRankings] = useState<UserRanking[]>([]);
  const [objectiveRankings, setObjectiveRankings] = useState<ObjectiveRanking[]>([]);
  const [okrRankings, setOKRRankings] = useState<OKRRanking[]>([]);

  const calculateQuarterProgress = async (
    companyId: string,
    quarterId: string,
    userId: string | null
  ): Promise<number> => {
    let query = supabase
      .from('objectives')
      .select('id')
      .eq('company_id', companyId)
      .eq('quarter_id', quarterId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: objectives } = await query;

    if (!objectives || objectives.length === 0) return 0;

    const objectiveIds = objectives.map(o => o.id);

    const { data: krs } = await supabase
      .from('key_results')
      .select('id')
      .in('objective_id', objectiveIds);

    if (!krs || krs.length === 0) return 0;

    const krIds = krs.map(kr => kr.id);

    const { data: checkins } = await supabase
      .from('kr_checkins')
      .select('key_result_id, attainment_pct, created_at')
      .eq('company_id', companyId)
      .in('key_result_id', krIds);

    if (!checkins || checkins.length === 0) return 0;

    const lastAttainments: number[] = [];

    krs.forEach(kr => {
      const krCheckins = checkins
        .filter(c => c.key_result_id === kr.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (krCheckins.length > 0 && krCheckins[0].attainment_pct !== null) {
        lastAttainments.push(krCheckins[0].attainment_pct);
      }
    });

    if (lastAttainments.length === 0) return 0;

    const avg = lastAttainments.reduce((sum, val) => sum + val, 0) / lastAttainments.length;
    return Math.round(avg);
  };

  const calculateQuarterPerformanceFromResults = async (
    state: AppState,
    userId: string | null
  ): Promise<QuarterPerformance[]> => {
    const performances: QuarterPerformance[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const q of state.quarters) {
      let result_pct = 0;
      let status: 'current' | 'finished' | 'future' = 'future';

      if (today >= q.start_date && today <= q.end_date) {
        status = 'current';
      } else if (today > q.end_date) {
        status = 'finished';
      }

      if (userId) {
        const { data: qResult } = await supabase
          .from('quarter_results')
          .select('result_percent')
          .eq('company_id', state.company_id)
          .eq('user_id', userId)
          .eq('quarter_id', q.id)
          .maybeSingle();

        if (qResult && qResult.result_percent !== null) {
          result_pct = Math.round(qResult.result_percent);
        } else if (status === 'current') {
          result_pct = await calculateQuarterProgress(state.company_id, q.id, userId);
        }
      } else {
        result_pct = await calculateQuarterProgress(state.company_id, q.id, null);
      }

      performances.push({
        quarter_id: q.id,
        quarter_name: q.name,
        result_pct,
        is_active: q.id === state.active_quarter?.id,
        status,
      });
    }

    return performances;
  };

  const calculateUserRankingsFromResults = async (
    companyId: string,
    quarterId: string
  ): Promise<UserRanking[]> => {
    const { data: quarterResults, error } = await supabase
      .from('quarter_results')
      .select('user_id, result_percent')
      .eq('company_id', companyId)
      .eq('quarter_id', quarterId)
      .order('result_percent', { ascending: false });

    if (error) {
      console.error('Erro ao buscar quarter_results:', error);
      return [];
    }

    if (!quarterResults || quarterResults.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(quarterResults.map(item => item.user_id)));

    const { data: profilesData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, sector, avatar_url, is_active')
      .in('id', userIds);

    if (profileError) {
      console.error('Erro ao buscar perfis para ranking:', profileError);
      return [];
    }

    const profilesMap = new Map(
      (profilesData || [])
        .filter(profile => profile.is_active)
        .map(profile => [profile.id, profile])
    );

    const rankings: UserRanking[] = [];

    quarterResults.forEach(result => {
      const profile = profilesMap.get(result.user_id);
      if (!profile) return;

      rankings.push({
        rank: rankings.length + 1,
        user_id: result.user_id,
        full_name: profile.full_name,
        sector: profile.sector,
        avatar_url: profile.avatar_url,
        result_pct: Math.round(result.result_percent ?? 0),
      });
    });

    return rankings;
  };

  const calculateObjectiveRankings = async (
    companyId: string,
    quarterId: string,
    userId: string | null
  ): Promise<ObjectiveRanking[]> => {
    if (!user) return [];

    let query = supabase
      .from('objectives')
      .select('id, title, percent_obj, key_results (percent_kr)')
      .eq('company_id', companyId)
      .eq('quarter_id', quarterId)
      .eq('archived', false);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: objectives } = await query;

    if (!objectives || objectives.length === 0) return [];

    return objectives
      .map(obj => {
        const krPercents = (obj.key_results ?? [])
          .map(kr => kr.percent_kr ?? null)
          .filter((value): value is number => typeof value === 'number');

        const aggregated = krPercents.length > 0
          ? Math.round(krPercents.reduce((sum, value) => sum + value, 0) / krPercents.length)
          : Math.round(obj.percent_obj ?? 0);

        return {
          objective_title: obj.title,
          result_pct: aggregated,
        };
      })
      .filter(item => item.result_pct > 0)
      .sort((a, b) => b.result_pct - a.result_pct);
  };

  const calculateOKRRankings = async (
    companyId: string,
    quarterId: string,
    userId: string | null
  ): Promise<OKRRanking[]> => {
    if (!user) return [];

    let query = supabase
      .from('key_results')
      .select('title, code, percent_kr')
      .eq('company_id', companyId)
      .eq('quarter_id', quarterId)
      .order('percent_kr', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: krs } = await query;

    if (!krs || krs.length === 0) return [];

    return krs.map(kr => ({
      code: kr.code,
      title: kr.title,
      result_pct: Math.round(kr.percent_kr ?? 0),
      owner_name: userProfile?.full_name ?? null,
    }));
  };

  useEffect(() => {
    if (!user || !selectedCompanyId) return;

    const loadBasicData = async () => {
      try {
        setLoading(true);

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, company_id, full_name, sector, avatar_url, is_active')
          .eq('id', user.id)
          .single();

        if (!profile || !profile.company_id) {
          setAppState(null);
          setLoading(false);
          return;
        }

        setUserProfile(profile);

        const { data: quarters } = await supabase
          .from('quarters')
          .select('id, name, start_date, end_date, is_active')
          .eq('company_id', selectedCompanyId)
          .order('start_date', { ascending: false });

        if (!quarters || quarters.length === 0) {
          setAppState(null);
          setLoading(false);
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        let activeQuarter = quarters.find(q => q.start_date <= today && q.end_date >= today);
        if (!activeQuarter) {
          activeQuarter = quarters[0];
        }

        const state: AppState = {
          company_id: selectedCompanyId,
          user_id: user.id,
          quarters,
          active_quarter: activeQuarter ?? null,
        };

        setAppState(state);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados básicos:', error);
        setLoading(false);
      }
    };

    loadBasicData();
  }, [user, selectedCompanyId]);

  useEffect(() => {
    if (!appState || !appState.active_quarter || !role) return;

    const loadRoleDependentData = async () => {
      try {
        const activeQuarter = appState.active_quarter!;
        const userIdFilter = role === 'admin' ? null : user!.id;

        let objectivesQuery = supabase
          .from('objectives')
          .select('id')
          .eq('company_id', selectedCompanyId!)
          .eq('quarter_id', activeQuarter.id)
          .eq('archived', false);

        if (userIdFilter) {
          objectivesQuery = objectivesQuery.eq('user_id', userIdFilter);
        }

        const { data: userObjectives } = await objectivesQuery;

        const objCount = userObjectives?.length ?? 0;
        setActiveObjectivesCount(objCount);

        if (objCount > 0) {
          const objectiveIds = userObjectives!.map(obj => obj.id);
          const { count } = await supabase
            .from('key_results')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', selectedCompanyId!)
            .in('objective_id', objectiveIds);

          setActiveOKRsCount(count ?? 0);
        } else {
          setActiveOKRsCount(0);
        }

        let calculatedProgress = 0;

        if (role !== 'admin') {
          const { data: quarterResult } = await supabase
            .from('quarter_results')
            .select('result_percent')
            .eq('company_id', selectedCompanyId!)
            .eq('user_id', user!.id)
            .eq('quarter_id', activeQuarter.id)
            .maybeSingle();

          if (quarterResult && quarterResult.result_percent !== null) {
            calculatedProgress = Math.round(quarterResult.result_percent);
          } else {
            calculatedProgress = await calculateQuarterProgress(
              selectedCompanyId!,
              activeQuarter.id,
              user!.id
            );
          }
        } else {
          const { data: allQuarterResults } = await supabase
            .from('quarter_results')
            .select('result_percent')
            .eq('company_id', selectedCompanyId!)
            .eq('quarter_id', activeQuarter.id);

          if (allQuarterResults && allQuarterResults.length > 0) {
            const validResults = allQuarterResults
              .map(r => r.result_percent)
              .filter((val): val is number => val !== null);

            if (validResults.length > 0) {
              const avg = validResults.reduce((sum, val) => sum + val, 0) / validResults.length;
              calculatedProgress = Math.round(avg);
            }
          }
        }

        setCurrentQuarterProgress(calculatedProgress);

        const rankings = await calculateUserRankingsFromResults(selectedCompanyId!, activeQuarter.id);
        setUserRankings(rankings);

        const objRanking = await calculateObjectiveRankings(selectedCompanyId!, activeQuarter.id, userIdFilter);
        setObjectiveRankings(objRanking);

        const okrRanking = await calculateOKRRankings(selectedCompanyId!, activeQuarter.id, userIdFilter);
        setOKRRankings(okrRanking);

        const perf = await calculateQuarterPerformanceFromResults(appState, role === 'admin' ? null : user!.id);
        setQuarterPerformance(perf);
      } catch (error) {
        console.error('Erro ao carregar dados dependentes de role:', error);
      }
    };

    loadRoleDependentData();
  }, [appState, role]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
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

  type ProgressStyle = CSSProperties & {
    '--progress-color'?: string;
  };

  const getProgressStyle = (pct: number): ProgressStyle => ({
    '--progress-color': getPerformanceColor(pct),
  });

  const topThreeRankings = useMemo(() => userRankings.slice(0, 3), [userRankings]);

  if (!user || !selectedCompanyId) {
    return (
      <Layout>
        <div className="py-24 text-center text-muted-foreground">
          Faça login para visualizar o dashboard.
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
          <p>Carregando dashboard...</p>
        </div>
      </Layout>
    );
  }

  if (!appState || !appState.active_quarter) {
    return (
      <Layout>
        <div className="py-24 text-center text-muted-foreground">
          Não foi possível localizar quarters para esta empresa.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Dashboard</p>
            <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {userProfile?.full_name ?? 'Usuário'}</h1>
            <p className="text-muted-foreground">
              Acompanhe a evolução dos objetivos e resultados-chave da empresa.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit px-4 py-2 text-sm">
            Quarter Ativo: {appState.active_quarter.name}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Objetivos Ativos"
            icon={<Target className="h-5 w-5" />}
            value={activeObjectivesCount}
            description="Objetivos acompanhados neste quarter"
          />
          <KpiCard
            title="OKRs Ativos"
            icon={<Calendar className="h-5 w-5" />}
            value={activeOKRsCount}
            description="Key Results com acompanhamento"
          />
          <KpiCard
            title="Média do Quarter"
            icon={<TrendingUp className="h-5 w-5" />}
            value={`${currentQuarterProgress}%`}
            description="Progresso consolidado do quarter"
          />
          <KpiCard
            title="Colaboradores ranqueados"
            icon={<Award className="h-5 w-5" />}
            value={userRankings.length}
            description="Participantes com resultados enviados"
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
                <CircularProgress percentage={currentQuarterProgress} size={220} strokeWidth={14} />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Resultado consolidado</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {quarterPerformance.map(perf => (
                  <div key={perf.quarter_id} className="flex items-center gap-3">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      perf.status === 'current' ? 'bg-primary' : perf.status === 'finished' ? 'bg-muted-foreground' : 'bg-muted'
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {perf.quarter_name}{perf.is_active ? ' (atual)' : ''}
                        </span>
                        <span className="text-muted-foreground">{perf.result_pct}%</span>
                      </div>
                      <Progress
                        value={perf.result_pct}
                        className="mt-2"
                        style={getProgressStyle(perf.result_pct)}
                      />
                    </div>
                  </div>
                ))}
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
            <CardContent>
              {topThreeRankings.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum resultado disponível.</p>
              ) : (
                <div className="space-y-4">
                  {topThreeRankings.map(ranking => (
                    <div key={ranking.user_id} className="flex items-center justify-between rounded-2xl border p-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-lg font-semibold">
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
                          <p className="font-semibold leading-tight">{ranking.full_name}</p>
                          <p className="text-sm text-muted-foreground">{ranking.sector ?? 'Sem setor'}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold">{ranking.result_pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RankingList
            title="Ranking completo"
            icon={<Trophy className="h-4 w-4" />}
            emptyMessage="Nenhum colaborador posicionado"
            data={userRankings}
          />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objetivos em Destaque
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Objetivos com maior percentual de atingimento.
              </p>
            </CardHeader>
            <CardContent>
              {objectiveRankings.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum objetivo disponível.</p>
              ) : (
                <div className="space-y-4">
                  {objectiveRankings.map((objective, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{objective.objective_title}</span>
                        <span className="text-muted-foreground">{objective.result_pct}%</span>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              OKRs em Destaque
            </CardTitle>
            <p className="text-sm text-muted-foreground">Key Results ordenados pelo percentual de atingimento.</p>
          </CardHeader>
          <CardContent>
            {okrRankings.length === 0 ? (
              <p className="text-center text-muted-foreground">Nenhum dado cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {okrRankings.map((okr, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        {okr.code && <span className="text-xs text-muted-foreground">{okr.code}</span>}
                        <span className="font-medium">{okr.title}</span>
                      </div>
                      <span className="font-semibold">{okr.result_pct}%</span>
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
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className="rounded-full bg-muted p-3 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
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
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {data.map(ranking => (
              <div key={ranking.user_id} className="flex items-center justify-between rounded-xl border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-semibold">
                    #{ranking.rank}
                  </Badge>
                  <div>
                    <p className="font-medium leading-tight">{ranking.full_name}</p>
                    <p className="text-xs text-muted-foreground">{ranking.sector ?? 'Sem setor'}</p>
                  </div>
                </div>
                <span className="font-semibold">{ranking.result_pct}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
