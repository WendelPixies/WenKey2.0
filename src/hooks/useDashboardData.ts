import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserRole } from '@/hooks/useUserRole';

// Interfaces
export interface Quarter {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

export interface UserProfile {
    id: string;
    company_id: string;
    full_name: string;
    sector: string | null;
    avatar_url: string | null;
    is_active: boolean;
}

export interface QuarterPerformance {
    quarter_id: string;
    quarter_name: string;
    result_pct: number;
    is_active: boolean;
    status: 'current' | 'finished' | 'future';
}

export interface UserRanking {
    rank: number;
    user_id: string;
    full_name: string;
    sector: string | null;
    avatar_url: string | null;
    result_pct: number;
}

export interface ObjectiveRanking {
    objective_title: string;
    result_pct: number;
    kr_count: number;
}

export interface OKRRanking {
    code: string | null;
    title: string;
    result_pct: number;
    owner_name: string | null;
    owner_sector: string | null;
    owner_avatar_url: string | null;
}

export interface DashboardData {
    company_id: string;
    user_id: string;
    quarters: Quarter[];
    active_quarter: Quarter | null;
    userProfile: UserProfile | null;
    metrics: {
        activeObjectivesCount: number;
        activeOKRsCount: number;
        currentQuarterProgress: number;
        quarterPerformance: QuarterPerformance[];
        userRankings: UserRanking[];
        objectiveRankings: ObjectiveRanking[];
        okrRankings: OKRRanking[];
    };
}

// Helper Functions (Business Logic)
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

// Hook Principal
export function useDashboardData() {
    const { user } = useAuth();
    const { selectedCompanyId } = useCompany();
    const { role, loading: roleLoading } = useUserRole();

    const enabled = !!user && !!selectedCompanyId && !roleLoading;

    return useQuery({
        queryKey: ['dashboard', user?.id, selectedCompanyId, role],
        queryFn: async (): Promise<DashboardData | null> => {
            if (!user || !selectedCompanyId || !role) return null;

            // 1. Fetch User Profile & Quarters (Basic Data)
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, company_id, full_name, sector, avatar_url, is_active')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile || !profile.company_id) return null;

            let avatar_url = profile.avatar_url;
            if (avatar_url && !avatar_url.startsWith('http')) {
                const { data } = supabase.storage.from('avatars').getPublicUrl(avatar_url);
                avatar_url = data.publicUrl;
            }

            const { data: quarters } = await supabase
                .from('quarters')
                .select('id, name, start_date, end_date, is_active')
                .eq('company_id', selectedCompanyId)
                .order('start_date', { ascending: false });

            if (!quarters || quarters.length === 0) return null;

            const today = new Date().toISOString().split('T')[0];
            let activeQuarter = quarters.find(q => q.start_date <= today && q.end_date >= today) || quarters[0];

            // 2. Fetch Metrics (Role Dependent)
            const userIdFilter = role === 'admin' ? null : user.id;

            // ... (Metrics calculation logic migrated from Dashboard.tsx)
            // Active Objectives Count
            let objectivesQuery = supabase
                .from('objectives')
                .select('id')
                .eq('company_id', selectedCompanyId)
                .eq('quarter_id', activeQuarter.id)
                .eq('archived', false);

            if (userIdFilter) objectivesQuery = objectivesQuery.eq('user_id', userIdFilter);
            const { data: userObjectives } = await objectivesQuery;
            const activeObjectivesCount = userObjectives?.length ?? 0;

            // Active OKRs Count
            let activeOKRsCount = 0;
            if (activeObjectivesCount > 0) {
                const objectiveIds = userObjectives!.map(obj => obj.id);
                const { count } = await supabase
                    .from('key_results')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', selectedCompanyId)
                    .in('objective_id', objectiveIds);
                activeOKRsCount = count ?? 0;
            }

            // Current Quarter Progress
            let currentQuarterProgress = 0;
            if (role !== 'admin') {
                const { data: quarterResult } = await supabase
                    .from('quarter_results')
                    .select('result_percent')
                    .eq('company_id', selectedCompanyId)
                    .eq('user_id', user.id)
                    .eq('quarter_id', activeQuarter.id)
                    .maybeSingle();

                if (quarterResult && quarterResult.result_percent !== null) {
                    currentQuarterProgress = Math.round(quarterResult.result_percent);
                } else {
                    currentQuarterProgress = await calculateQuarterProgress(selectedCompanyId, activeQuarter.id, user.id);
                }
            } else {
                const { data: allQuarterResults } = await supabase
                    .from('quarter_results')
                    .select('result_percent')
                    .eq('company_id', selectedCompanyId)
                    .eq('quarter_id', activeQuarter.id);

                if (allQuarterResults && allQuarterResults.length > 0) {
                    const validResults = allQuarterResults
                        .map(r => r.result_percent)
                        .filter((val): val is number => val !== null);
                    if (validResults.length > 0) {
                        const avg = validResults.reduce((sum, val) => sum + val, 0) / validResults.length;
                        currentQuarterProgress = Math.round(avg);
                    }
                }
            }

            // Rankings Calculation (Inline or helper)
            // Helper: User Rankings
            const { data: quarterResults } = await supabase
                .from('quarter_results')
                .select('user_id, result_percent')
                .eq('company_id', selectedCompanyId)
                .eq('quarter_id', activeQuarter.id)
                .order('result_percent', { ascending: false });

            const userRankings: UserRanking[] = [];
            if (quarterResults && quarterResults.length > 0) {
                const userIds = Array.from(new Set(quarterResults.map(item => item.user_id)));
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, sector, avatar_url, is_active')
                    .in('id', userIds);

                const profilesMap = new Map((profilesData || []).filter(p => p.is_active).map(p => [p.id, p]));
                quarterResults.forEach(result => {
                    const prof = profilesMap.get(result.user_id);
                    if (!prof) return;
                    let av = prof.avatar_url;
                    if (av && !av.startsWith('http')) {
                        const { data } = supabase.storage.from('avatars').getPublicUrl(av);
                        av = data.publicUrl;
                    }
                    userRankings.push({
                        rank: userRankings.length + 1,
                        user_id: result.user_id,
                        full_name: prof.full_name,
                        sector: prof.sector,
                        avatar_url: av,
                        result_pct: Math.round(result.result_percent ?? 0)
                    });
                });
            }

            // Helper: Objective Rankings
            const { data: allObjectives } = await supabase
                .from('objectives')
                .select('id, title, percent_obj, user_id, key_results (id, percent_kr)')
                .eq('company_id', selectedCompanyId)
                .eq('quarter_id', activeQuarter.id)
                .eq('archived', false);

            const objectiveRankings: ObjectiveRanking[] = [];
            if (allObjectives && allObjectives.length > 0) {
                const groups = new Map<string, { totalPct: number; userCount: number; krCount: number }>();
                allObjectives.forEach(obj => {
                    const title = obj.title.trim();
                    const current = groups.get(title) || { totalPct: 0, userCount: 0, krCount: 0 };
                    current.totalPct += obj.percent_obj ?? 0;
                    current.userCount += 1;
                    current.krCount += (obj.key_results as any[])?.length || 0;
                    groups.set(title, current);
                });
                for (const [title, stats] of groups.entries()) {
                    const avg = Math.round(stats.totalPct / stats.userCount);
                    objectiveRankings.push({
                        objective_title: title,
                        result_pct: avg,
                        kr_count: stats.krCount
                    });
                }
                objectiveRankings.sort((a, b) => b.result_pct - a.result_pct);
            }

            // Helper: OKR Rankings
            let krsQuery = supabase.from('key_results')
                .select('title, code, percent_kr, user_id, objectives(user_id)')
                .eq('company_id', selectedCompanyId)
                .eq('quarter_id', activeQuarter.id)
                .order('percent_kr', { ascending: false });
            if (userIdFilter) krsQuery = krsQuery.eq('user_id', userIdFilter);

            const { data: krs } = await krsQuery;
            const okrRankings: OKRRanking[] = [];
            if (krs && krs.length > 0) {
                const ownerIds = Array.from(new Set(krs.map(kr => (kr.objectives as any)?.user_id || kr.user_id).filter(Boolean)));
                const { data: owners } = await supabase.from('profiles').select('id, full_name, sector, avatar_url').in('id', ownerIds);
                const ownersMap = new Map(owners?.map(o => [o.id, o]) || []);
                krs.forEach(kr => {
                    const ownerId = (kr.objectives as any)?.user_id || kr.user_id;
                    const owner = ownersMap.get(ownerId);
                    let av = owner?.avatar_url;
                    if (av && !av.startsWith('http')) {
                        const { data } = supabase.storage.from('avatars').getPublicUrl(av);
                        av = data.publicUrl;
                    }
                    okrRankings.push({
                        code: kr.code,
                        title: kr.title,
                        result_pct: Math.round(kr.percent_kr ?? 0),
                        owner_name: owner?.full_name ?? null,
                        owner_sector: owner?.sector ?? null,
                        owner_avatar_url: av ?? null
                    });
                });
            }

            // Quarter Performance History
            const quarterPerformance: QuarterPerformance[] = [];
            for (const q of quarters) {
                let result_pct = 0;
                let status: 'current' | 'finished' | 'future' = 'future';
                if (today >= q.start_date && today <= q.end_date) status = 'current';
                else if (today > q.end_date) status = 'finished';

                if (role !== 'admin') { // User specific
                    const { data: qResult } = await supabase.from('quarter_results')
                        .select('result_percent')
                        .eq('company_id', selectedCompanyId)
                        .eq('user_id', user.id)
                        .eq('quarter_id', q.id)
                        .maybeSingle();
                    if (qResult && qResult.result_percent !== null) result_pct = Math.round(qResult.result_percent);
                    else if (status === 'current') result_pct = await calculateQuarterProgress(selectedCompanyId, q.id, user.id);
                } else { // Admin (Company wide)
                    // Logic simplified for history - using calculateQuarterProgress(null) for simplicity or existing results
                    result_pct = await calculateQuarterProgress(selectedCompanyId, q.id, null);
                }

                quarterPerformance.push({
                    quarter_id: q.id,
                    quarter_name: q.name,
                    result_pct,
                    is_active: q.id === activeQuarter.id,
                    status
                });
            }

            return {
                company_id: selectedCompanyId,
                user_id: user.id,
                quarters,
                active_quarter: activeQuarter,
                userProfile: { ...profile, avatar_url },
                metrics: {
                    activeObjectivesCount,
                    activeOKRsCount,
                    currentQuarterProgress,
                    quarterPerformance,
                    userRankings,
                    objectiveRankings,
                    okrRankings
                }
            };
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes cache
        refetchOnWindowFocus: false
    });
}
