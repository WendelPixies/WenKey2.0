
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Target, Users, TrendingUp, GitMerge, AlertCircle } from 'lucide-react';

export default function Prototypes() {
    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Laboratório de Ideias</h1>
                    <p className="text-muted-foreground">
                        Visualizações conceituais de novas funcionalidades para o sistema.
                    </p>
                </div>

                <Tabs defaultValue="evolution" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="evolution">1. Gráficos de Evolução</TabsTrigger>
                        <TabsTrigger value="alignment">2. Árvore de Alinhamento</TabsTrigger>
                    </TabsList>

                    <TabsContent value="evolution" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Evolução Temporal do Key Result
                                </CardTitle>
                                <CardDescription>
                                    Acompanhamento semanal do progresso em direção à meta.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px] w-full">
                                    <MockEvolutionChart />
                                </div>
                                <div className="mt-4 flex gap-4 text-sm text-muted-foreground justify-center">
                                    <div className="flex items-center gap-1">
                                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                                        <span>Realizado</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                                        <span>Projeção Ideal</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Velocidade Média</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">+5.2% / semana</div>
                                    <p className="text-xs text-green-600 mt-1">Acima do necessário (+0.8%)</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Forecast (Previsão)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-700">104%</div>
                                    <p className="text-xs text-muted-foreground mt-1">Se mantiver o ritmo atual</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Risco</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-2xl font-bold text-green-700">Baixo</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Consistência alta nos check-ins</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="alignment">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitMerge className="h-5 w-5" />
                                    Mapa de Alinhamento (Alignment Tree)
                                </CardTitle>
                                <CardDescription>
                                    Visualização hierárquica de como os esforços individuais contribuem para a estratégia global.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="bg-slate-50/50 p-8 min-h-[600px] flex justify-center overflow-x-auto">
                                <MockAlignmentTree />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}

// --- MOCK COMPONENTS ---

const MockEvolutionChart = () => {
    const data = [
        { week: 'Sem 1', target: 8, actual: 8 },
        { week: 'Sem 2', target: 16, actual: 18 },
        { week: 'Sem 3', target: 25, actual: 22 },
        { week: 'Sem 4', target: 33, actual: 30 },
        { week: 'Sem 5', target: 41, actual: 45 },
        { week: 'Sem 6', target: 50, actual: 52 },
        { week: 'Sem 7', target: 58, actual: 65 },
        { week: 'Sem 8', target: 66, actual: 70 },
        { week: 'Sem 9', target: 75, actual: null }, // Future
        { week: 'Sem 10', target: 83, actual: null },
        { week: 'Sem 11', target: 91, actual: null },
        { week: 'Sem 12', target: 100, actual: null },
    ];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <ReferenceLine x="Sem 8" stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Hoje', position: 'top', fill: '#ef4444', fontSize: 12 }} />
                <Line type="monotone" dataKey="target" stroke="#cbd5e1" strokeWidth={2} dot={false} name="Meta Ideal" />
                <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} name="Realizado" />
            </LineChart>
        </ResponsiveContainer>
    );
};

const MockAlignmentTree = () => {
    return (
        <div className="flex flex-col items-center gap-12 w-full max-w-5xl">
            {/* Level 1: Company */}
            <div className="relative group">
                <ObjectiveCard
                    type="company"
                    title="Faturar R$ 10 Milhões em 2026"
                    progress={65}
                    owner="WenKey Global"
                />
                <div className="absolute top-full left-1/2 h-12 w-0.5 bg-slate-300 -translate-x-1/2"></div>
            </div>

            {/* Level 2: Departments */}
            <div className="grid grid-cols-3 gap-16 relative w-full">
                {/* Connecting Line Level 2 */}
                <div className="absolute -top-12 left-[16.66%] right-[16.66%] h-0.5 bg-slate-300"></div>
                <div className="absolute -top-12 left-1/2 h-6 w-0.5 bg-slate-300 -translate-x-1/2"></div>
                <div className="absolute -top-12 left-[16.66%] h-6 w-0.5 bg-slate-300"></div>
                <div className="absolute -top-12 right-[16.66%] h-6 w-0.5 bg-slate-300"></div>

                {/* Dept 1 */}
                <div className="flex flex-col items-center relative">
                    <ObjectiveCard
                        type="dept"
                        title="Aumentar Vendas Enterprise"
                        progress={78}
                        owner="Comercial"
                    />
                    <div className="absolute top-full left-1/2 h-8 w-0.5 bg-slate-300 -translate-x-1/2"></div>

                    {/* Level 3: Individual KRs for Dept 1 */}
                    <div className="mt-8 flex flex-col gap-4 w-full">
                        <KRCard title="Fechar 5 contratos > 100k" progress={80} owner="Ana Sales" avatar="AS" />
                        <KRCard title="Pipeline de 2M qualificado" progress={45} owner="João BDR" avatar="JB" warning />
                    </div>
                </div>

                {/* Dept 2 */}
                <div className="flex flex-col items-center relative">
                    <ObjectiveCard
                        type="dept"
                        title="Reduzir Churn Rate"
                        progress={40}
                        owner="Customer Success"
                        warning
                    />
                    <div className="absolute top-full left-1/2 h-8 w-0.5 bg-slate-300 -translate-x-1/2"></div>

                    {/* Level 3: Individual KRs for Dept 2 */}
                    <div className="mt-8 flex flex-col gap-4 w-full">
                        <KRCard title="Implementar Onboarding 2.0" progress={30} owner="Maria CS" avatar="MC" warning />
                        <KRCard title="NPS acima de 75" progress={85} owner="Pedro Sup" avatar="PS" />
                    </div>
                </div>

                {/* Dept 3 */}
                <div className="flex flex-col items-center relative">
                    <ObjectiveCard
                        type="dept"
                        title="Lançar App Mobile"
                        progress={90}
                        owner="Produto/Tech"
                    />
                    {/* No children shown for simplicity */}
                </div>
            </div>
        </div>
    );
};

// --- HELPER CARDS ---

const ObjectiveCard = ({ type, title, progress, owner, warning = false }: any) => {
    const isCompany = type === 'company';
    return (
        <div className={`relative z-10 flex flex-col gap-2 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md 
      ${isCompany ? 'w-80 border-t-4 border-t-primary' : 'w-64 border-t-4 border-t-blue-500'}
      ${warning ? 'border-t-orange-500' : ''}
    `}>
            <div className="flex justify-between items-start">
                <Badge variant="secondary" className="text-[10px]">{isCompany ? 'COMPANHIA' : 'DEPARTAMENTO'}</Badge>
                <span className={`text-sm font-bold ${warning ? 'text-orange-600' : 'text-green-600'}`}>{progress}%</span>
            </div>
            <p className="font-semibold leading-tight text-sm line-clamp-2">{title}</p>
            <div className="flex items-center gap-2 mt-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{owner}</span>
            </div>
        </div>
    );
};

const KRCard = ({ title, progress, owner, avatar, warning = false }: any) => {
    return (
        <div className="relative z-10 flex items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm transition-all hover:translate-x-1">
            {/* Connector dot */}
            <div className="absolute -left-4 top-1/2 w-4 h-[1px] bg-slate-300"></div>

            <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="text-[10px] bg-slate-100">{avatar}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <p className="text-xs font-medium truncate">{title}</p>
                    <span className="text-[10px] text-muted-foreground">{owner}</span>
                </div>
            </div>

            <Badge variant={warning ? 'destructive' : 'default'} className="h-5 text-[10px] px-1.5">
                {progress}%
            </Badge>
        </div>
    );
};
