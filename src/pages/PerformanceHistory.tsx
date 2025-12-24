
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
            setUsers(usersData || []);

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
        if (pct <= 20) return 'text-red-500 font-bold';
        if (pct <= 40) return 'text-orange-500 font-bold';
        if (pct <= 60) return 'text-yellow-500 font-bold';
        if (pct <= 80) return 'text-lime-600 font-bold';
        if (pct <= 100) return 'text-green-600 font-bold';
        return 'text-green-700 font-bold'; // > 100%
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const filteredUsers = useMemo(() => {
        if (activeUsersOnly) {
            return users.filter(u => u.is_active);
        }
        return users;
    }, [users, activeUsersOnly]);

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
                            Histórico de Performance
                        </h1>
                        <p className="text-muted-foreground">
                            Acompanhamento de resultados por quarter e média anual dos colaboradores.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Select
                                value={filterCompanyId}
                                onValueChange={setFilterCompanyId}
                            >
                                <SelectTrigger className="w-[240px]">
                                    <SelectValue placeholder="Selecione a Empresa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.name}
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
                                <SelectValue placeholder="Filtro de usuários" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Apenas Ativos</SelectItem>
                                <SelectItem value="all">Todos os Usuários</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            Tabela de Resultados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum usuário encontrado.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[300px]">Colaborador</TableHead>
                                            {quarters.map(quarter => (
                                                <TableHead key={quarter.id} className="text-center min-w-[100px]">
                                                    <div>{quarter.name}</div>
                                                    <div className="text-xs font-normal text-muted-foreground">
                                                        {new Date(quarter.end_date).toLocaleDateString()}
                                                    </div>
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-center font-bold bg-muted/30 w-[120px]">
                                                Média Geral
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map(user => {
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
                                                                <div className="font-medium">{user.full_name}</div>
                                                                {user.sector && (
                                                                    <div className="text-xs text-muted-foreground">{user.sector}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {quarters.map(quarter => {
                                                        const result = getResult(user.id, quarter.id);
                                                        return (
                                                            <TableCell key={quarter.id} className="text-center">
                                                                {result ? (
                                                                    <span className={getPerformanceColor(result.result_percent)}>
                                                                        {Math.round(result.result_percent)}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}

                                                    <TableCell className="text-center bg-muted/30">
                                                        {avg > 0 ? (
                                                            <Badge variant="outline" className={`${getPerformanceColor(avg)} border-current`}>
                                                                {avg}%
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">-</span>
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
