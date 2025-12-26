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
