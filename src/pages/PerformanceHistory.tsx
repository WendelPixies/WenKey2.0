
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { toTitleCase } from '@/lib/utils';

interface Company {
    id: string;
    name: string;
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
    full_name: string;
    avatar_url: string | null;
    sector: string | null;
    is_active: boolean;
    company_id: string;
}

interface QuarterResult {
    quarter_id: string;
    user_id: string;
    result_percent: number;
}

export default function PerformanceHistory() {
    const { selectedCompanyId } = useCompany();
    const { isAdmin } = useUserRole();
    const [loading, setLoading] = useState(true);
    const [activeUsersOnly, setActiveUsersOnly] = useState(true);

    // Data State
    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [results, setResults] = useState<QuarterResult[]>([]);

    // Admin Filter State
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filterCompanyId, setFilterCompanyId] = useState<string>("");

    useEffect(() => {
        if (selectedCompanyId) {
            setFilterCompanyId(selectedCompanyId);
        }
    }, [selectedCompanyId]);

    useEffect(() => {
        if (filterCompanyId) {
            loadData();
        }
    }, [filterCompanyId]);

    useEffect(() => {
        if (isAdmin) {
            loadCompanies();
        }
    }, [isAdmin]);

    const loadCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setCompanies(data || []);
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    };

    useEffect(() => {
        // Remove direct dependency on selectedCompanyId for loadData
        // because we want to update filterCompanyId first
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Quarters (sorted by date)
            const { data: quartersData, error: quartersError } = await supabase
                .from('quarters')
                .select('*')
                .eq('company_id', filterCompanyId)
                .order('start_date', { ascending: true });

            if (quartersError) throw quartersError;
            setQuarters(quartersData || []);

            // 2. Fetch Users
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, sector, is_active, company_id')
                .eq('company_id', filterCompanyId)
                .order('full_name');

            if (usersError) throw usersError;

            const normalizedUsers = (usersData || []).map(u => {
                let avatarUrl = u.avatar_url;
                if (avatarUrl && !avatarUrl.startsWith('http')) {
                    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
                    avatarUrl = data.publicUrl;
                }
                return { ...u, avatar_url: avatarUrl };
            });

            setUsers(normalizedUsers);

            // 3. Fetch Quarter Results
            const { data: resultsData, error: resultsError } = await supabase
                .from('quarter_results')
                .select('quarter_id, user_id, result_percent')
                .eq('company_id', filterCompanyId);

            if (resultsError) throw resultsError;
            setResults(resultsData || []);

        } catch (error: any) {
            console.error('Error loading history:', error);
            toast.error('Erro ao carregar histórico de performance');
        } finally {
            setLoading(false);
        }
    };

    // Helper to get result for a specific cell
    const getResult = (userId: string, quarterId: string) => {
        return results.find(r => r.user_id === userId && r.quarter_id === quarterId);
    };

    // Helper to calculate average for a user
    const getUserAverage = (userId: string) => {
        const userResults = results.filter(r => r.user_id === userId);
        if (userResults.length === 0) return 0;

        const sum = userResults.reduce((acc, curr) => acc + (curr.result_percent || 0), 0);
        return Math.round(sum / userResults.length);
    };

    const getPerformanceColor = (pct: number) => {
        return 'text-black font-normal';
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const sortedAndFilteredUsers = useMemo(() => {
        const list = activeUsersOnly ? users.filter(u => u.is_active) : [...users];
        return list.sort((a, b) => {
            const avgA = getUserAverage(a.id);
            const avgB = getUserAverage(b.id);
            return avgB - avgA;
        });
    }, [users, activeUsersOnly, results]);

    const effectiveCompanyId = isAdmin ? filterCompanyId : selectedCompanyId;

    if (!effectiveCompanyId) {
        return (
            <Layout>
                <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
                    Selecione uma empresa para visualizar o histórico.
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <TrendingUp className="h-8 w-8" />
                            {toTitleCase('Histórico de Performance')}
                        </h1>
                        <p className="text-base font-normal text-black">
                            {toTitleCase('Acompanhamento de resultados por quarter e média anual dos colaboradores.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Select
                                value={filterCompanyId}
                                onValueChange={setFilterCompanyId}
                            >
                                <SelectTrigger className="w-[240px]">
                                    <SelectValue placeholder={toTitleCase('Selecione a Empresa')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {toTitleCase(company.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Select
                            value={activeUsersOnly ? "active" : "all"}
                            onValueChange={(v) => setActiveUsersOnly(v === "active")}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={toTitleCase('Filtro de usuários')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">{toTitleCase('Apenas Ativos')}</SelectItem>
                                <SelectItem value="all">{toTitleCase('Todos os Usuários')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            {toTitleCase('Tabela de Resultados')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
                            </div>
                        ) : sortedAndFilteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-base font-normal text-muted-foreground">
                                {toTitleCase('Nenhum colaborador encontrado.')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[300px] text-black">{toTitleCase('Colaborador')}</TableHead>
                                            {quarters.map(quarter => (
                                                <TableHead key={quarter.id} className="text-center min-w-[100px] text-black">
                                                    <div>{toTitleCase(quarter.name)}</div>
                                                    <div className="text-xs font-normal text-black">
                                                        {new Date(quarter.end_date).toLocaleDateString()}
                                                    </div>
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-center font-normal bg-muted/30 w-[120px] text-base text-black">
                                                {toTitleCase('Média Geral')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedAndFilteredUsers.map(user => {
                                            const avg = getUserAverage(user.id);
                                            return (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={user.avatar_url || undefined} />
                                                                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-base font-normal">{toTitleCase(user.full_name)}</div>
                                                                {user.sector && (
                                                                    <div className="text-sm text-black">{toTitleCase(user.sector)}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {quarters.map(quarter => {
                                                        const result = getResult(user.id, quarter.id);
                                                        return (
                                                            <TableCell key={quarter.id} className="text-center text-base font-normal">
                                                                {result ? (
                                                                    <span className={getPerformanceColor(result.result_percent).replace('font-bold', 'font-normal')}>
                                                                        {Math.round(result.result_percent)}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-black">-</span>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}

                                                    <TableCell className="text-center bg-muted/30">
                                                        {avg > 0 ? (
                                                            <Badge variant="outline" className={`${getPerformanceColor(avg).replace('font-bold', 'font-normal')} border-current text-base font-normal`}>
                                                                {avg}%
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-base">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
