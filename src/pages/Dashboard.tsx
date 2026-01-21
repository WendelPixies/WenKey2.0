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
import { cn, toTitleCase } from '@/lib/utils';
import { ActiveQuarterInfo } from '@/components/ActiveQuarterInfo';

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
  kr_count: number;
}

interface OKRRanking {
  code: string | null;
  title: string;
  result_pct: number;
  owner_name: string | null;
  owner_sector: string | null;
  owner_avatar_url: string | null;
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

      let avatar_url = profile.avatar_url;
      if (avatar_url && !avatar_url.startsWith('http')) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
        avatar_url = data.publicUrl;
      }

      rankings.push({
        rank: rankings.length + 1,
        user_id: result.user_id,
        full_name: profile.full_name,
        sector: profile.sector,
        avatar_url,
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

    // Busca TODOS os objetivos da empresa para este quarter, independente do usuário selecionado no dash
    // Conforme pedido: "Verificar o percentual de todos os usuários da empresa selecionada"
    const { data: allObjectives, error: objError } = await supabase
      .from('objectives')
      .select('id, title, percent_obj, user_id, key_results (id, percent_kr)')
      .eq('company_id', companyId)
      .eq('quarter_id', quarterId)
      .eq('archived', false);

    if (objError || !allObjectives || allObjectives.length === 0) return [];

    // Agrupar por título
    const groups = new Map<string, { totalPct: number; userCount: number; krCount: number }>();

    allObjectives.forEach(obj => {
      const title = obj.title.trim();
      const current = groups.get(title) || { totalPct: 0, userCount: 0, krCount: 0 };

      // O percentual do objetivo já é atualizado pelo KRCheckins.tsx
      current.totalPct += obj.percent_obj ?? 0;
      current.userCount += 1;
      current.krCount += (obj.key_results as any[])?.length || 0;

      groups.set(title, current);
    });

    const result: ObjectiveRanking[] = [];

    for (const [title, stats] of groups.entries()) {
      const avg = Math.round(stats.totalPct / stats.userCount);
      result.push({
        objective_title: title,
        result_pct: avg,
        kr_count: stats.krCount
      });

      // Salva ou atualiza no Supabase conforme solicitado
      try {
        await supabase
          .from('objective_group_results')
          .upsert({
            company_id: companyId,
            quarter_id: quarterId,
            objective_title: title,
            avg_attainment_pct: avg,
            kr_count: stats.krCount,
            updated_at: new Date().toISOString()
          }, { onConflict: 'company_id,quarter_id,objective_title' });
      } catch (e) {
        console.error('Erro ao salvar objective_group_results:', e);
      }
    }

    return result
      .filter(item => item.result_pct > 0 || item.kr_count > 0)
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
      .select('title, code, percent_kr, user_id, objectives(user_id)')
      .eq('company_id', companyId)
      .eq('quarter_id', quarterId)
      .order('percent_kr', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: krs } = await query;

    if (!krs || krs.length === 0) return [];

    // Busca os perfis dos donos dos KRs (priorizando o dono do Objetivo)
    const ownerIds = Array.from(new Set(krs.map(kr => {
      const obj = kr.objectives as any;
      return (obj ? obj.user_id : null) || kr.user_id;
    }).filter(Boolean)));

    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, sector, avatar_url')
      .in('id', ownerIds);

    const ownersMap = new Map(owners?.map(o => [o.id, o]) || []);

    return krs.map(kr => {
      const obj = kr.objectives as any;
      const ownerId = (obj ? obj.user_id : null) || kr.user_id;
      const owner = ownersMap.get(ownerId);

      let owner_avatar_url = owner?.avatar_url;
      if (owner_avatar_url && !owner_avatar_url.startsWith('http')) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(owner_avatar_url);
        owner_avatar_url = data.publicUrl;
      }

      return {
        code: kr.code,
        title: kr.title,
        result_pct: Math.round(kr.percent_kr ?? 0),
        owner_name: owner?.full_name ?? null,
        owner_sector: owner?.sector ?? null,
        owner_avatar_url: owner_avatar_url ?? null,
      };
    });
  };

  useEffect(() => {
    if (!user || !selectedCompanyId) return;

    let mounted = true;

    const loadBasicData = async () => {
      // Safety timeout
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Dashboard: loadBasicData timed out');
          setLoading(false);
        }
      }, 5000);

      try {
        setLoading(true);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, company_id, full_name, sector, avatar_url, is_active')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
        }

        if (mounted) {
          if (!profile || !profile.company_id) {
            setAppState(null);
            setLoading(false);
            return;
          }

          if (profile) {
            let avatar_url = profile.avatar_url;
            if (avatar_url && !avatar_url.startsWith('http')) {
              const { data } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
              avatar_url = data.publicUrl;
            }
            setUserProfile({
              ...profile,
              avatar_url
            });
          }

          const { data: quarters, error: quartersError } = await supabase
            .from('quarters')
            .select('id, name, start_date, end_date, is_active')
            .eq('company_id', selectedCompanyId)
            .order('start_date', { ascending: false });

          if (quartersError) {
            console.error('Erro ao buscar quarters:', quartersError);
          }

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
        }
      } catch (error) {
        console.error('Erro ao carregar dados básicos:', error);
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    loadBasicData();

    return () => {
      mounted = false;
    };
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

        const objRanking = await calculateObjectiveRankings(selectedCompanyId!, activeQuarter.id, null);
        setObjectiveRankings(objRanking);

        const okrRanking = await calculateOKRRankings(selectedCompanyId!, activeQuarter.id, null);
        setOKRRankings(okrRanking);

        const perf = await calculateQuarterPerformanceFromResults(appState, role === 'admin' ? null : user!.id);
        setQuarterPerformance(perf);
      } catch (error) {
        console.error('Erro ao carregar dados dependentes de role:', error);
      }
    };

    loadRoleDependentData();
  }, [appState, role]);

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-black">{toTitleCase('Dashboard')}</p>
            <h1 className="text-3xl font-bold tracking-tight text-black">{toTitleCase('Bem-vindo')}, {toTitleCase(userProfile?.full_name ?? 'Usuário')}</h1>
            <p className="text-black">
              {toTitleCase('Acompanhe a evolução dos objetivos e resultados-chave da empresa.')}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-1 pr-6 min-w-[320px]">
            <ActiveQuarterInfo quarter={appState.active_quarter} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={toTitleCase('Objetivos Ativos')}
            icon={<Target className="h-5 w-5" />}
            value={activeObjectivesCount}
            description={toTitleCase('Objetivos acompanhados neste quarter')}
          />
          <KpiCard
            title={toTitleCase('OKRs Ativos')}
            icon={<Calendar className="h-5 w-5" />}
            value={activeOKRsCount}
            description={toTitleCase('Key Results com acompanhamento')}
          />
          <KpiCard
            title={toTitleCase('Média do Quarter')}
            icon={<TrendingUp className="h-5 w-5" />}
            value={`${currentQuarterProgress}%`}
            description={toTitleCase('Progresso consolidado do quarter')}
          />
          <KpiCard
            title={toTitleCase('Colaboradores ranqueados')}
            icon={<Award className="h-5 w-5" />}
            value={userRankings.length}
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
            data={userRankings}
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
                {objectiveRankings.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nenhum objetivo disponível.</p>
                ) : (
                  <div className="space-y-4">
                    {objectiveRankings
                      .sort((a, b) => b.result_pct - a.result_pct)
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
                {objectiveRankings.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nenhum objetivo disponível.</p>
                ) : (
                  <div className="space-y-3">
                    {objectiveRankings
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
            {okrRankings.length === 0 ? (
              <p className="text-center text-muted-foreground">Nenhum dado cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {okrRankings.map((okr, index) => (
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
