import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface Quarter {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface QuarterCheckin {
  id: string;
  quarter_id: string;
  checkin_date: string;
  name?: string;
  is_active?: boolean;
  result_percent?: number | null;
}

interface Objective {
  id: string;
  title: string;
  quarter_id: string;
}

interface KeyResult {
  id: string;
  objective_id: string;
  company_id: string;
  user_id: string | null;
  code: string | null;
  title: string;
  type: string | null;
  direction: string | null;
  unit: string | null;
  baseline: number | null;
  floor_value: number | null;
  target: number | null;
  weight: number;
}

interface CheckinResult {
  id?: string;
  key_result_id: string;
  checkin_id: string;
  user_id: string | null;
  valor_realizado: number | null;
  percentual_atingido: number | null;
  meta_checkin: number | null;
  minimo_orcamento: number | null;
  note?: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  company_id: string | null;
}

interface UserProfile {
  id: string;
  company_id: string | null;
}

export default function KRCheckins() {
  const { toast } = useToast();
  const { selectedCompanyId } = useCompany();
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const canEditAnyCheckin = role === 'admin' || role === 'manager';
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [quarterCheckins, setQuarterCheckins] = useState<QuarterCheckin[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [checkinResults, setCheckinResults] = useState<Record<string, CheckinResult>>({});
  const [editingData, setEditingData] = useState<Record<string, { meta: string; minimo: string; realizado: string }>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentKR, setCurrentKR] = useState<KeyResult | null>(null);
  const [currentCheckin, setCurrentCheckin] = useState<QuarterCheckin | null>(null);
  const [formData, setFormData] = useState({ meta: '', minimo: '', realizado: '', observacoes: '' });

  // Novos filtros
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [filterOwnerId, setFilterOwnerId] = useState<string>('all');
  const [selectedCheckinDate, setSelectedCheckinDate] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Carregar perfil do usuário
  useEffect(() => {
    if (user && !roleLoading) {
      loadUserProfile();
    }
  }, [user, roleLoading]);



  // Resetar data selecionada quando quarter mudar
  useEffect(() => {
    setSelectedCheckinDate(null);
  }, [selectedQuarter]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single();

    if (error) {
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setUserProfile(data);

    // Aplicar filtros automáticos baseado no perfil
    if (role === 'user') {
      // User: fixar na empresa e no próprio usuário
      if (data.company_id) {
        setFilterCompanyId(data.company_id);
      }
      setFilterOwnerId(user.id);
    } else if (role === 'manager') {
      // Manager: fixar na empresa dele
      if (data.company_id) {
        setFilterCompanyId(data.company_id);
      }
    }
    // Admin: não aplica filtro automático
  };
  useEffect(() => {
    if (userProfile) {
      loadCompanies();
    }
  }, [userProfile]);

  useEffect(() => {
    const companyIdToLoad =
      (filterCompanyId && filterCompanyId !== 'all')
        ? filterCompanyId
        : (userProfile?.company_id ? userProfile.company_id : selectedCompanyId);

    if (companyIdToLoad) {
      loadQuarters(companyIdToLoad);
    }
  }, [selectedCompanyId, filterCompanyId, userProfile]);

  useEffect(() => {
    if (filterCompanyId && filterCompanyId !== 'all') {
      loadUsers();
    } else {
      setUsers([]);
      // Não resetar filterOwnerId se for 'user', pois ele deve manter fixo no próprio ID
      if (role !== 'user') {
        setFilterOwnerId('all');
      }
    }
  }, [filterCompanyId, userProfile]);

  useEffect(() => {
    if (selectedQuarter && userProfile) {
      loadQuarterCheckins();
      loadObjectivesAndKRs();
    }
  }, [selectedQuarter, filterCompanyId, filterOwnerId, userProfile]);

  useEffect(() => {
    if (keyResults.length > 0 && quarterCheckins.length > 0) {
      loadCheckinResults();
    }
  }, [keyResults, quarterCheckins]);

  const loadCompanies = async () => {
    // Admin vê todas, manager/user vê apenas a sua
    let query = supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true);

    if (role !== 'admin') {
      // Manager e User: filtrar pela empresa do perfil
      if (userProfile?.company_id) {
        query = query.eq('id', userProfile.company_id);
      }
    }

    const { data, error } = await query.order('name');

    if (error) {
      toast({
        title: 'Erro ao carregar empresas',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setCompanies(data || []);
  };

  const loadUsers = async () => {
    if (!filterCompanyId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, company_id')
      .eq('company_id', filterCompanyId)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setUsers(data || []);
  };

  const loadQuarters = async (companyId: string) => {
    const { data, error } = await supabase
      .from('quarters')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar trimestres',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setQuarters(data || []);
    if (data && data.length > 0) {
      setSelectedQuarter(data[0].id);
    } else {
      setSelectedQuarter('');
    }
  };

  const loadQuarterCheckins = async () => {
    if (!selectedQuarter) return;

    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('quarter_id', selectedQuarter)
      .order('checkin_date', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao carregar checkins',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setQuarterCheckins(data || []);

    // Se n��o houver KRs carregados, limpamos os resultados mas mantemos os check-ins carregados
    if (keyResults.length === 0) {
      setCheckinResults({});
    }
  };

  const loadObjectivesAndKRs = async () => {
    if (!selectedQuarter || !user) return;

    let objectivesQuery = supabase
      .from('objectives')
      .select('id, title, quarter_id')
      .eq('quarter_id', selectedQuarter)
      .eq('archived', false);

    // Aplica filtro de usuário conforme seleção/permissão
    const selectedUserId = role === 'user'
      ? user.id
      : (filterOwnerId && filterOwnerId !== 'all' ? filterOwnerId : null);
    if (selectedUserId) {
      objectivesQuery = objectivesQuery.eq('user_id', selectedUserId);
    }

    // Aplicar filtro de empresa se selecionado
    if (filterCompanyId && filterCompanyId !== 'all') {
      objectivesQuery = objectivesQuery.eq('company_id', filterCompanyId);
    } else if (selectedCompanyId) {
      objectivesQuery = objectivesQuery.eq('company_id', selectedCompanyId);
    }

    const { data: objData, error: objError } = await objectivesQuery;

    if (objError) {
      toast({
        title: 'Erro ao carregar objetivos',
        description: objError.message,
        variant: 'destructive',
      });
      return;
    }

    setObjectives(objData || []);

    if (objData && objData.length > 0) {
      const objectiveIds = objData.map(o => o.id);

      const { data: krData, error: krError } = await supabase
        .from('key_results')
        .select('*')
        .in('objective_id', objectiveIds);

      if (krError) {
        toast({
          title: 'Erro ao carregar key results',
          description: krError.message,
          variant: 'destructive',
        });
        return;
      }

      setKeyResults(krData || []);
    } else {
      setKeyResults([]);
    }
  };

  const loadCheckinResults = async () => {
    if (!selectedQuarter) return;

    // Determinar o filtro de usuário selecionado (para filtrar pelo dono do KR)
    let selectedUserId: string | null = null;
    if (role === 'user') {
      selectedUserId = user?.id || null;
    } else if (role === 'manager' || role === 'admin') {
      if (filterOwnerId && filterOwnerId !== 'all') {
        selectedUserId = filterOwnerId;
      }
    }

    const checkinIds = quarterCheckins.map((c) => c.id);
    if (checkinIds.length === 0) {
      setCheckinResults({});
      return;
    }

    const ownerMap = keyResults.reduce<Record<string, string | null>>((acc, kr) => {
      acc[kr.id] = kr.user_id ?? null;
      return acc;
    }, {});

    // Buscar resultados do check-in do quarter selecionado
    // Se um usuário for selecionado, filtramos pelo DONO do KR (key_results.user_id)
    let query = supabase
      .from('checkin_results')
      .select('*, key_results!inner(user_id)')
      .in('checkin_id', checkinIds);

    if (selectedUserId) {
      query = query.eq('key_results.user_id', selectedUserId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: 'Erro ao carregar valores',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const resultsMap: Record<string, CheckinResult> = {};
    data?.forEach((result: any) => {
      const ownerId =
        ownerMap[result.key_result_id] ?? result.key_results?.user_id ?? null;

      const isManagerOrAdmin = role === 'manager' || role === 'admin';

      if (ownerId && result.user_id && ownerId !== result.user_id && !isManagerOrAdmin) {
        return;
      }

      if (role === 'user' && ownerId && ownerId !== user?.id) {
        return;
      }

      const key = `${result.key_result_id}-${result.checkin_id}`;
      resultsMap[key] = {
        id: result.id,
        key_result_id: result.key_result_id,
        checkin_id: result.checkin_id,
        user_id: result.user_id ?? null,
        valor_realizado: result.valor_realizado,
        percentual_atingido: result.percentual_atingido,
        meta_checkin: result.meta_checkin,
        minimo_orcamento: result.minimo_orcamento,
        note: result.note ?? null,
      };
    });

    setCheckinResults(resultsMap);
  };

  const formatInputValue = (value: string, type: string | null) => {
    if (!value) return '';
    const numValue = parseFloat(parseInputValue(value));
    if (isNaN(numValue)) return value;

    switch (type) {
      case 'percentual':
      case 'percentage':
        return `${numValue}%`;
      case 'moeda':
      case 'currency':
        return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      default:
        return numValue.toLocaleString('pt-BR');
    }
  };

  const parseInputValue = (value: string) => {
    if (!value) return '';

    // Remove currency/percent symbols and spaces (including NBSP/thin space)
    let v = value.replace(/[R$%]/g, '').replace(/[\s\u00A0\u202F]/g, '');

    // If value has both '.' and ',', assume Brazilian format: '.' thousands and ',' decimal
    if (v.includes(',') && v.includes('.')) {
      v = v.replace(/\./g, '').replace(',', '.');
    } else if (v.includes(',') && !v.includes('.')) {
      // Only comma -> decimal separator
      v = v.replace(',', '.');
    } else if (v.includes('.')) {
      // Only dots present. If multiple dots, keep the last as decimal and remove the rest (thousands)
      v = v.replace(/\.(?=.*\.)/g, '');
    }

    return v;
  };

  // Live mask for Brazilian Real currency (e.g., "R$ 10.000.000,00")
  const formatCurrencyInputLive = (raw: string) => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    // Separate integer and decimal parts (2 decimal digits) and remove leading zeros from the integer part
    let intPartRaw = digits.length > 2 ? digits.slice(0, -2) : '0';
    const decPart = digits.slice(-2).padStart(2, '0');
    intPartRaw = intPartRaw.replace(/^0+(?=\d)/, ''); // keep single 0, remove extra leading zeros

    const intFormatted = (intPartRaw || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${intFormatted},${decPart}`;
  };

  // Live mask for Percentage (e.g., "85%")
  const formatPercentageInputLive = (raw: string) => {
    if (!raw) return '';
    const digits = raw.replace(/[^\d,.-]/g, '');
    if (!digits) return '';
    return `${digits}%`;
  };

  // Live mask for Number with Brazilian formatting (e.g., "10.000")
  const formatNumberInputLive = (raw: string) => {
    if (!raw) return '';
    const cleaned = raw.replace(/[^\d]/g, '');
    if (!cleaned) return '';
    const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return formatted;
  };
  const openDialog = async (kr: KeyResult, checkin: QuarterCheckin) => {
    setCurrentKR(kr);
    setCurrentCheckin(checkin);
    const key = `${kr.id}-${checkin.id}`;
    const existing = checkinResults[key];

    // Fetch the note from the database if it exists
    let note = existing?.note || '';
    if (!note && existing?.id) {
      const { data } = await supabase
        .from('checkin_results')
        .select('note')
        .eq('id', existing.id)
        .single();
      note = data?.note || '';
    }

    setFormData({
      meta: existing?.meta_checkin != null ? formatInputValue(existing.meta_checkin.toString(), kr.type) : '',
      minimo: existing?.minimo_orcamento != null ? formatInputValue(existing.minimo_orcamento.toString(), kr.type) : '',
      realizado: existing?.valor_realizado != null ? formatInputValue(existing.valor_realizado.toString(), kr.type) : '',
      observacoes: note,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setCurrentKR(null);
    setCurrentCheckin(null);
    setFormData({ meta: '', minimo: '', realizado: '', observacoes: '' });
  };

  const handleSaveCheckin = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('handleSaveCheckin iniciado');
    if (!currentKR || !currentCheckin) {
      console.log('currentKR ou currentCheckin não definidos', { currentKR, currentCheckin });
      return;
    }

    if (!selectedCompanyId) {
      console.log('selectedCompanyId não definido');
      toast({
        title: 'Erro',
        description: 'Empresa não selecionada',
        variant: 'destructive',
      });
      return;
    }

    const meta = parseFloat(parseInputValue(formData.meta));
    const minimo = parseFloat(parseInputValue(formData.minimo));
    const realizado = parseFloat(parseInputValue(formData.realizado));

    console.log('Valores parseados:', { meta, minimo, realizado });

    if (isNaN(meta) || isNaN(minimo)) {
      toast({
        title: 'Erro',
        description: 'Meta e Mínimo Orçamento são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const kr = currentKR;

    // Calcular percentual de atingimento:
    // - aumento (maior � melhor): realizado / meta (limitado a 100%)
    // - redu��o (menor � melhor): meta / realizado (limitado a 100%; se realizado <= meta, conta 100%)
    const percentualAtingido = calculateKR(
      isNaN(realizado) ? 0 : realizado,
      isNaN(minimo) ? null : minimo,
      isNaN(meta) ? null : meta,
      kr.direction
    );
    const roundedPercentual = Math.round(percentualAtingido);

    const key = `${currentKR.id}-${currentCheckin.id}`;
    const existingResult = checkinResults[key];

    try {
      if (existingResult?.id) {
        // Atualizar
        if (!user?.id) {
          toast({
            title: 'Erro',
            description: 'Usuário não autenticado',
            variant: 'destructive',
          });
          throw new Error('Usuário não autenticado');
        }

        console.log('Atualizando registro existente:', existingResult.id);
        const { error: updateError, data: updatedRows } = await supabase
          .from('checkin_results')
          .update({
            meta_checkin: meta,
            minimo_orcamento: minimo,
            valor_realizado: isNaN(realizado) ? null : realizado,
            percentual_atingido: roundedPercentual,
            note: formData.observacoes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResult.id)
          .select();

        if (updateError) {
          console.error('Erro ao atualizar:', updateError);
          throw updateError;
        }
        if (!updatedRows || updatedRows.length === 0) {
          console.warn('Nenhuma linha atualizada (possível bloqueio por RLS)');
          throw new Error(
            canEditAnyCheckin
              ? 'Não foi possível atualizar este check-in. Verifique se ele ainda existe.'
              : 'Você não tem permissão para atualizar este check-in'
          );
        }
        console.log('Atualização bem-sucedida');
      } else {
        // Criar
        if (!user?.id) {
          toast({
            title: "Erro",
            description: "Usuário não autenticado",
            variant: "destructive",
          });
          throw new Error("Usuário não autenticado");
        }

        const responsibleUserId = currentKR.user_id || user.id;
        if (!responsibleUserId) {
          throw new Error('Não foi possível identificar o responsável pelo check-in.');
        }

        const insertData = {
          key_result_id: currentKR.id,
          checkin_id: currentCheckin.id,
          company_id: currentKR.company_id || selectedCompanyId,
          user_id: responsibleUserId,
          meta_checkin: meta,
          minimo_orcamento: minimo,
          valor_realizado: isNaN(realizado) ? null : realizado,
          percentual_atingido: roundedPercentual,
          note: formData.observacoes || null,
        };
        console.log('Criando novo registro:', insertData);

        const { error, data } = await supabase
          .from('checkin_results')
          .insert(insertData)
          .select();

        if (error) {
          console.error('Erro ao inserir:', error);
          throw error;
        }
        console.log('Inserção bem-sucedida:', data);
      }

      await updateStoredProgress(kr, roundedPercentual);
      // Recarregar os dados para refletir as mudanças
      await loadCheckinResults();

      toast({
        title: 'Sucesso',
        description: 'Dados salvos com sucesso',
      });

      closeDialog();
    } catch (error: any) {
      console.error('Erro no catch:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatValue = (value: number | null, type: string | null, unit: string | null) => {
    if (value === null || value === undefined) return '--';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '--';

    switch (type) {
      case 'percentual':
      case 'percentage':
        return `${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
      case 'moeda':
      case 'currency':
        return numValue.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      default:
        return `${numValue.toLocaleString('pt-BR')} ${unit || ''}`;
    }
  };

  const translateType = (type: string | null) => {
    switch (type) {
      case 'currency':
      case 'moeda':
        return 'moeda';
      case 'percentual':
        return 'percentual';
      case 'numero':
        return 'número';
      default:
        return type || '--';
    }
  };

  const translateDirection = (direction: string | null) => {
    switch (direction) {
      case 'increase':
        return 'crescente';
      case 'decrease':
        return 'decrescente';
      case 'maintain':
        return 'manter';
      default:
        return direction || '--';
    }
  };

  const calculateAttainment = (realized: number, target: number, direction: string | null) => {
    if (target === null || target === undefined) return 0;
    return calculateKR(realized, null, target, direction);
  };

  const getProgressColor = (percentage: number): string => {
    // Verde apenas quando atingimento for 100% (ou acima, já clamped)
    if (percentage >= 100) return '#00CC00';
    if (percentage >= 70) return '#FFCC00'; // Amarelo para alto mas não completo
    if (percentage >= 40) return '#FF6600'; // Laranja
    return '#FF0000'; // Vermelho para baixo
  };

  const calculateKR = (
    realized: number,
    min: number | null,
    target: number | null,
    direction: string | null
  ) => {
    // Basic safety
    if (target === null || target === undefined) return 0;

    const safeTarget = Number(target);
    const safeRealized = Number(realized);
    const safeMin = (min !== null && min !== undefined) ? Number(min) : null;

    // Logic for "Increase" / "Maior é melhor" (Default)
    if (!direction || direction === 'increase' || direction === 'maior-é-melhor') {

      // If Minimum Budget (Piso) is defined
      if (safeMin !== null) {
        // Realized >= Target -> 100%
        if (safeRealized >= safeTarget) return 100;

        // Realized < Min -> 0%
        if (safeRealized < safeMin) return 0;

        // Formula: ((Realized - Min) / (Target - Min)) * 100
        const denominator = safeTarget - safeMin;
        if (denominator === 0) return 0; // Avoid division by zero

        const result = ((safeRealized - safeMin) / denominator) * 100;
        return Math.max(0, Math.min(100, result));
      }

      // Fallback if no Min is defined (Simple percentage)
      if (safeTarget === 0) return 0;
      const result = (safeRealized / safeTarget) * 100;
      return Math.min(100, Math.max(0, result));
    }

    // Logic for "Decrease" (Menor é melhor)
    if (direction === 'decrease' || direction === 'menor-é-melhor') {
      if (safeRealized <= safeTarget) return 100;

      // Simple linear decay for now as no formula provided for decrease
      if (safeTarget === 0) return 0; // Prevent div by zero
      // Example: 200% - (Realized/Target)%
      const result = ((2 * safeTarget - safeRealized) / safeTarget) * 100;
      return Math.max(0, result);
    }

    return 0;
  };

  const updateStoredProgress = async (kr: KeyResult, newPercent: number) => {
    try {
      await supabase
        .from('key_results')
        .update({ percent_kr: newPercent })
        .eq('id', kr.id);

      let objectiveQuery = supabase
        .from('key_results')
        .select('percent_kr')
        .eq('objective_id', kr.objective_id);

      if (kr.company_id) {
        objectiveQuery = objectiveQuery.eq('company_id', kr.company_id);
      }

      const { data: objectiveKRs, error: fetchError } = await objectiveQuery;

      if (fetchError) throw fetchError;

      const validPercents = (objectiveKRs ?? [])
        .map((item) => item.percent_kr)
        .filter((value): value is number => typeof value === 'number');

      const objectivePercent =
        validPercents.length > 0
          ? Math.round(validPercents.reduce((sum, value) => sum + value, 0) / validPercents.length)
          : newPercent;

      await supabase
        .from('objectives')
        .update({ percent_obj: objectivePercent })
        .eq('id', kr.objective_id);
    } catch (error) {
      console.error('Erro ao sincronizar percentuais de objetivo/KR:', error);
    }
  };

  const parseDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return null;

    const [yearStr, monthStr, dayPart] = dateString.split('-');
    if (!yearStr || !monthStr || !dayPart) return null;

    const cleanedDay = dayPart.replace(/[^0-9].*$/, '');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(cleanedDay);

    if ([year, month, day].some((value) => Number.isNaN(value))) {
      return null;
    }

    return new Date(year, month - 1, day);
  };

  const getCheckinTime = (dateString: string | null | undefined) => {
    const parsed = parseDateOnly(dateString);
    return parsed ? parsed.getTime() : null;
  };

  const handleInputChange = (krId: string, checkinId: string, field: 'meta' | 'minimo' | 'realizado', value: string) => {
    const key = `${krId}-${checkinId}`;
    const current = editingData[key] || { meta: '', minimo: '', realizado: '' };

    setEditingData({
      ...editingData,
      [key]: {
        ...current,
        [field]: value,
      }
    });
  };

  const initializeEditingData = (krId: string, checkinId: string) => {
    const key = `${krId}-${checkinId}`;
    if (editingData[key]) return;

    const existing = checkinResults[key];
    setEditingData({
      ...editingData,
      [key]: {
        meta: existing?.meta_checkin?.toString() || '',
        minimo: existing?.minimo_orcamento?.toString() || '',
        realizado: existing?.valor_realizado?.toString() || '',
      }
    });
  };

  const getInputType = (type: string | null) => {
    if (type === 'moeda' || type === 'currency') return 'text';
    if (type === 'percentual' || type === 'percentage' || type === 'numero' || type === 'number') return 'number';
    return 'text';
  };

  const getInputStep = (type: string | null) => {
    return type === 'moeda' ? '0.01' : '0.1';
  };

  const groupedObjectives = useMemo(() => {
    const titleMap = new Map<string, { objectives: Objective[]; keyResults: KeyResult[] }>();
    const objectiveIdToTitle = new Map<string, string>();

    objectives.forEach((obj) => {
      objectiveIdToTitle.set(obj.id, obj.title);
      if (!titleMap.has(obj.title)) {
        titleMap.set(obj.title, { objectives: [], keyResults: [] });
      }
      titleMap.get(obj.title)!.objectives.push(obj);
    });

    keyResults.forEach((kr) => {
      const title = objectiveIdToTitle.get(kr.objective_id);
      if (!title) return;
      titleMap.get(title)?.keyResults.push(kr);
    });

    return Array.from(titleMap.entries())
      .map(([title, data]) => ({ title, ...data }))
      .filter((group) => group.keyResults.length > 0);
  }, [objectives, keyResults]);

  const calculateGroupAverage = useCallback((groupKRs: KeyResult[], checkinId: string) => {
    let weightedSum = 0;
    let totalWeight = 0;
    let count = 0;

    groupKRs.forEach((kr) => {
      const key = `${kr.id}-${checkinId}`;
      const result = checkinResults[key];

      if (
        result &&
        result.valor_realizado !== null &&
        result.meta_checkin !== null &&
        result.minimo_orcamento !== null
      ) {
        const krPercentage = calculateKR(
          result.valor_realizado,
          result.minimo_orcamento,
          result.meta_checkin,
          kr.direction
        );

        const weight = typeof kr.weight === 'number' && !Number.isNaN(kr.weight) ? kr.weight : 1;
        weightedSum += krPercentage * weight;
        totalWeight += weight;
        count++;
      }
    });

    return {
      average: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0,
      hasData: count > 0,
    };
  }, [checkinResults]);

  const checkinGroupAverages = useMemo(() => {
    const map: Record<string, Record<string, { average: number; hasData: boolean }>> = {};

    groupedObjectives.forEach((group) => {
      map[group.title] = {};
      quarterCheckins.forEach((checkin) => {
        map[group.title][checkin.id] = calculateGroupAverage(group.keyResults, checkin.id);
      });
    });

    return map;
  }, [groupedObjectives, quarterCheckins, calculateGroupAverage]);

  const checkinOverallAverages = useMemo(() => {
    const map: Record<string, { average: number; hasData: boolean }> = {};

    quarterCheckins.forEach((checkin) => {
      let sum = 0;
      let count = 0;

      groupedObjectives.forEach((group) => {
        const stats = checkinGroupAverages[group.title]?.[checkin.id];
        if (stats?.hasData) {
          sum += stats.average;
          count++;
        }
      });

      map[checkin.id] = {
        average: count > 0 ? Math.round(sum / count) : 0,
        hasData: count > 0,
      };
    });

    return map;
  }, [quarterCheckins, groupedObjectives, checkinGroupAverages]);

  const activeCheckinId = useMemo(() => {
    if (quarterCheckins.length === 0) return null;

    const sorted = [...quarterCheckins].sort((a, b) => {
      const timeA = getCheckinTime(a.checkin_date);
      const timeB = getCheckinTime(b.checkin_date);
      return (timeA ?? Number.POSITIVE_INFINITY) - (timeB ?? Number.POSITIVE_INFINITY);
    });

    const referenceList = sorted.filter((checkin) => getCheckinTime(checkin.checkin_date) !== null);
    const orderedList = referenceList.length > 0 ? referenceList : sorted;
    if (orderedList.length === 0) return null;

    const now = currentDate.getTime();
    const firstStart = getCheckinTime(orderedList[0].checkin_date);

    if (firstStart !== null && now < firstStart) {
      return orderedList[0].id;
    }

    for (let i = 0; i < orderedList.length; i++) {
      const start = getCheckinTime(orderedList[i].checkin_date);
      if (start === null) continue;
      const nextStart = orderedList[i + 1] ? getCheckinTime(orderedList[i + 1].checkin_date) : null;

      if (!nextStart && now >= start) {
        return orderedList[i].id;
      }

      if (nextStart !== null && now >= start && now < nextStart) {
        return orderedList[i].id;
      }
    }

    return orderedList[orderedList.length - 1]?.id ?? null;
  }, [quarterCheckins, currentDate]);

  // Inicializar data selecionada com a mais recente quando quarterCheckins mudar
  useEffect(() => {
    if (quarterCheckins.length > 0 && !selectedCheckinDate) {
      if (activeCheckinId) {
        setSelectedCheckinDate(activeCheckinId);
        return;
      }

      const sortedCheckins = [...quarterCheckins].sort((a, b) => {
        const timeA = getCheckinTime(a.checkin_date);
        const timeB = getCheckinTime(b.checkin_date);
        return (timeB ?? Number.NEGATIVE_INFINITY) - (timeA ?? Number.NEGATIVE_INFINITY);
      });
      setSelectedCheckinDate(sortedCheckins[0].id);
    }
  }, [quarterCheckins, selectedCheckinDate, activeCheckinId]);

  useEffect(() => {
    if (activeCheckinId && checkinOverallAverages[activeCheckinId]) {
      setCurrentResult(checkinOverallAverages[activeCheckinId].average);
    } else {
      setCurrentResult(0);
    }
  }, [activeCheckinId, checkinOverallAverages]);

  useEffect(() => {
    const saveQuarterResult = async () => {
      if (!user || !selectedQuarter || !activeCheckinId) return;

      const targetCompanyId =
        filterCompanyId && filterCompanyId !== 'all'
          ? filterCompanyId
          : (userProfile?.company_id ?? selectedCompanyId);

      const targetUserId =
        role === 'user'
          ? user.id
          : (filterOwnerId && filterOwnerId !== 'all' ? filterOwnerId : null);

      if (!targetCompanyId || !targetUserId) return;

      const stats = checkinOverallAverages[activeCheckinId];
      if (!stats?.hasData) return;

      try {
        const { data: existingResult, error } = await supabase
          .from('quarter_results')
          .select('id')
          .eq('company_id', targetCompanyId)
          .eq('user_id', targetUserId)
          .eq('quarter_id', selectedQuarter)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar resultado do quarter:', error);
          return;
        }

        const payload = {
          result_percent: currentResult,
          updated_at: new Date().toISOString(),
        };

        if (existingResult) {
          await supabase.from('quarter_results').update(payload).eq('id', existingResult.id);
        } else {
          await supabase.from('quarter_results').insert({
            company_id: targetCompanyId,
            user_id: targetUserId,
            quarter_id: selectedQuarter,
            result_percent: currentResult,
            saved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Erro ao salvar resultado do quarter:', error);
      }
    };

    saveQuarterResult();
  }, [
    activeCheckinId,
    checkinOverallAverages,
    currentResult,
    selectedQuarter,
    user,
    userProfile,
    filterOwnerId,
    filterCompanyId,
    selectedCompanyId,
    role,
  ]);

  useEffect(() => {
    const persistCompletedCheckins = async () => {
      if (!role || role === 'user' || quarterCheckins.length === 0) return;

      const sorted = [...quarterCheckins].sort((a, b) => {
        const timeA = getCheckinTime(a.checkin_date);
        const timeB = getCheckinTime(b.checkin_date);
        return (timeA ?? Number.POSITIVE_INFINITY) - (timeB ?? Number.POSITIVE_INFINITY);
      });
      const now = currentDate.getTime();
      const updates: { id: string; value: number }[] = [];

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const nextStart = getCheckinTime(sorted[i + 1].checkin_date);
        if (nextStart === null) {
          continue;
        }
        const stats = checkinOverallAverages[current.id];
        const alreadySaved = current.result_percent !== null && current.result_percent !== undefined;

        if (!alreadySaved && stats?.hasData && now >= nextStart) {
          updates.push({ id: current.id, value: stats.average });
        }
      }

      if (updates.length === 0) return;

      try {
        await Promise.all(
          updates.map(async (update) => {
            const { error: updateError } = await supabase
              .from('checkins')
              .update({
                result_percent: update.value,
                updated_at: new Date().toISOString(),
              })
              .eq('id', update.id);

            if (updateError) {
              throw updateError;
            }
          })
        );

        setQuarterCheckins((prev) =>
          prev.map((checkin) => {
            const update = updates.find((u) => u.id === checkin.id);
            return update ? { ...checkin, result_percent: update.value } : checkin;
          })
        );
      } catch (error) {
        console.error('Erro ao salvar resultado do check-in:', error);
      }
    };

    persistCompletedCheckins();
  }, [quarterCheckins, checkinOverallAverages, currentDate, role]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Check-ins de Key Results</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PRIMEIRO: Filtro de Empresa */}
          {role === 'admin' && (
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Select
                value={filterCompanyId || 'all'}
                onValueChange={(value) => {
                  setFilterCompanyId(value);
                  setFilterOwnerId('all');
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies
                    .filter((company) => company.id)
                    .map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* SEGUNDO: Filtro de Quarter */}
          <div>
            <Label htmlFor="quarter">Quarter</Label>
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione o quarter" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {quarters.map((quarter) => (
                  <SelectItem key={quarter.id} value={quarter.id}>
                    {quarter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TERCEIRO: Filtro de Usuário */}
          {role === 'admin' && (
            <div>
              <Label htmlFor="user">Usuário</Label>
              <Select
                value={filterOwnerId || 'all'}
                onValueChange={setFilterOwnerId}
                disabled={!filterCompanyId || filterCompanyId === 'all'}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users
                    .filter((user) => user.id)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {selectedQuarter && (
          <Card className="w-fit">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">RESULTADO ATUAL</p>
                  <p className="text-4xl font-bold text-primary">{currentResult}%</p>
                </div>
                <Progress
                  value={currentResult}
                  className="h-3 w-32"
                  style={{ '--progress-color': getProgressColor(currentResult) } as React.CSSProperties}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedQuarter && quarterCheckins.length > 0 && objectives.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] sticky left-0 bg-background z-10 text-primary font-semibold px-2">
                        Código
                      </TableHead>
                      <TableHead className="w-[200px] sticky left-[60px] bg-background z-10 px-3">
                        Key Result
                      </TableHead>
                      {quarterCheckins.map((checkin) => (
                        <TableHead
                          key={checkin.id}
                          className={`text-center min-w-[200px] px-4 cursor-pointer transition-colors ${selectedCheckinDate === checkin.id
                            ? 'bg-primary/10 border-b-2 border-primary'
                            : 'hover:bg-muted/50'
                            }`}
                          onClick={() => setSelectedCheckinDate(checkin.id)}
                        >
                          <div className={`font-bold ${selectedCheckinDate === checkin.id ? 'text-primary' : ''}`}>
                            {formatDate(checkin.checkin_date)}
                          </div>
                          {selectedCheckinDate === checkin.id && (
                            <div className="text-xs text-primary mt-1">Selecionada</div>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedObjectives.map((group) => (
                      <React.Fragment key={group.title}>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={2} className="sticky left-0 bg-muted/50 z-10 px-2">
                            <div className="text-base font-bold text-primary uppercase py-2">
                              {group.title}
                            </div>
                          </TableCell>
                          {quarterCheckins.map((checkin) => {
                            const stats = checkinGroupAverages[group.title]?.[checkin.id];
                            const avgPercentage = stats?.average ?? 0;

                            return (
                              <TableCell key={checkin.id} className="bg-muted/50 text-center px-2">
                                <div className="flex flex-col items-center gap-1 py-2">
                                  <span className="text-xl font-bold text-primary">{avgPercentage}%</span>
                                  <Progress
                                    value={avgPercentage}
                                    className="h-2 w-20"
                                    style={{ '--progress-color': getProgressColor(avgPercentage) } as React.CSSProperties}
                                  />
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        {group.keyResults.map((kr, index) => (
                          <TableRow key={kr.id}>
                            <TableCell className="sticky left-0 bg-background z-10 font-bold px-2">
                              KR{index + 1}
                            </TableCell>
                            <TableCell className="sticky left-[60px] bg-background z-10 px-3">
                              <div className="text-sm font-medium uppercase whitespace-normal">{kr.title}</div>
                              <div className="text-xs text-muted-foreground mt-1 uppercase whitespace-nowrap">
                                Tipo: {translateType(kr.type)} • Direção: {translateDirection(kr.direction)}
                              </div>
                            </TableCell>
                            {quarterCheckins.map((checkin) => {
                              const key = `${kr.id}-${checkin.id}`;
                              const result = checkinResults[key];

                              return (
                                <TableCell
                                  key={checkin.id}
                                  className="p-4 cursor-pointer hover:bg-muted/50 min-w-[200px]"
                                  onClick={() => openDialog(kr, checkin)}
                                >
                                  {result ? (
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs text-muted-foreground">META:</p>
                                        <p className="font-medium">{formatValue(result.meta_checkin, kr.type, kr.unit)}</p>
                                      </div>

                                      <div>
                                        <p className="text-xs text-muted-foreground">MIN. ORÇAM:</p>
                                        <p className="font-medium">{formatValue(result.minimo_orcamento, kr.type, kr.unit)}</p>
                                      </div>

                                      {result.valor_realizado !== null && result.meta_checkin !== null && result.minimo_orcamento !== null && (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">REALIZADO:</span>
                                            <div className="text-right">
                                              <div className="font-bold">{formatValue(result.valor_realizado, kr.type, kr.unit)}</div>
                                              <div className="text-[10px] font-semibold text-[#0d3a8c]">
                                                <span>Atingimento:</span>
                                                <span className="ml-1">{calculateAttainment(result.valor_realizado, result.meta_checkin, kr.direction).toFixed(2)}%</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <Progress
                                              value={calculateKR(
                                                result.valor_realizado,
                                                result.minimo_orcamento,
                                                result.meta_checkin,
                                                kr.direction
                                              )}
                                              className="h-2"
                                              style={{
                                                ['--progress-color' as any]: getProgressColor(calculateKR(
                                                  result.valor_realizado,
                                                  result.minimo_orcamento,
                                                  result.meta_checkin,
                                                  kr.direction
                                                ))
                                              }}
                                            />
                                            <div className="flex justify-between items-center text-[10px]">
                                              <span className="text-muted-foreground">KR:</span>
                                              <span className="font-semibold text-primary text-sm">
                                                {calculateKR(result.valor_realizado, result.minimo_orcamento, result.meta_checkin, kr.direction).toFixed(2)}%
                                              </span>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="w-full">
                                      Cadastrar Meta
                                    </Button>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedQuarter && (objectives.length === 0 || quarterCheckins.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {quarterCheckins.length === 0
                ? 'Nenhum check-in cadastrado para este trimestre'
                : 'Nenhum objetivo cadastrado para este trimestre'}
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}>
          <DialogContent
            className="max-w-lg max-h-[85vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Cadastrar Meta do Check-in</DialogTitle>
            </DialogHeader>

            {currentKR && currentCheckin && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-semibold">Key Result:</span> {currentKR.title}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Check-in:</span> {formatDate(currentCheckin.checkin_date)}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Tipo:</span> {translateType(currentKR.type)}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>META:</Label>
                        <span className="text-lg font-bold">
                          {formatValue(parseFloat(parseInputValue(formData.meta)) || 0, currentKR.type, currentKR.unit)}
                        </span>
                      </div>
                      <Input
                        type="text"
                        placeholder={currentKR.type === 'moeda' || currentKR.type === 'currency' ? 'Ex: R$ 1.000,00' : currentKR.type === 'percentual' || currentKR.type === 'percentage' ? 'Ex: 85%' : 'Ex: 100'}
                        value={formData.meta}
                        onChange={(e) => {
                          const v = e.target.value;
                          let formatted = v;
                          if (currentKR.type === 'moeda' || currentKR.type === 'currency') {
                            formatted = formatCurrencyInputLive(v);
                          } else if (currentKR.type === 'percentual' || currentKR.type === 'percentage') {
                            formatted = formatPercentageInputLive(v);
                          } else {
                            formatted = formatNumberInputLive(v);
                          }
                          setFormData({
                            ...formData,
                            meta: formatted,
                          });
                        }}
                        onBlur={() => setFormData({ ...formData, meta: formatInputValue(formData.meta, currentKR.type) })}
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>MIN. ORÇAM:</Label>
                        <span className="text-lg font-bold">
                          {formatValue(parseFloat(parseInputValue(formData.minimo)) || 0, currentKR.type, currentKR.unit)}
                        </span>
                      </div>
                      <Input
                        type="text"
                        placeholder={currentKR.type === 'moeda' || currentKR.type === 'currency' ? 'Ex: R$ 1.000,00' : currentKR.type === 'percentual' || currentKR.type === 'percentage' ? 'Ex: 50%' : 'Ex: 50'}
                        value={formData.minimo}
                        onChange={(e) => {
                          const v = e.target.value;
                          let formatted = v;
                          if (currentKR.type === 'moeda' || currentKR.type === 'currency') {
                            formatted = formatCurrencyInputLive(v);
                          } else if (currentKR.type === 'percentual' || currentKR.type === 'percentage') {
                            formatted = formatPercentageInputLive(v);
                          } else {
                            formatted = formatNumberInputLive(v);
                          }
                          setFormData({
                            ...formData,
                            minimo: formatted,
                          });
                        }}
                        onBlur={() => setFormData({ ...formData, minimo: formatInputValue(formData.minimo, currentKR.type) })}
                        className="text-right"
                      />
                    </div>
                  </div>

                  {formData.meta && formData.minimo && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>REALIZADO:</Label>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatValue(parseFloat(parseInputValue(formData.realizado)) || 0, currentKR.type, currentKR.unit)}
                          </div>
                          {formData.realizado && formData.meta && (
                            <div className="text-sm space-y-1">
                              <div className="font-semibold text-[#0d3a8c]">
                                <span>Atingimento:</span>
                                <span className="ml-1">{calculateAttainment(parseFloat(parseInputValue(formData.realizado)) || 0, parseFloat(parseInputValue(formData.meta)) || 0, currentKR.direction).toFixed(2)}%</span>
                              </div>
                              <div className="font-semibold text-primary text-sm">
                                KR: {calculateKR(
                                  parseFloat(parseInputValue(formData.realizado)) || 0,
                                  parseFloat(parseInputValue(formData.minimo)) || 0,
                                  parseFloat(parseInputValue(formData.meta)) || 0,
                                  currentKR.direction
                                ).toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Progress
                        value={formData.realizado ? calculateKR(
                          parseFloat(parseInputValue(formData.realizado)) || 0,
                          parseFloat(parseInputValue(formData.minimo)) || 0,
                          parseFloat(parseInputValue(formData.meta)) || 0,
                          currentKR.direction
                        ) : 0}
                        className="h-3"
                        style={{
                          ['--progress-color' as any]: getProgressColor(formData.realizado ? calculateKR(
                            parseFloat(parseInputValue(formData.realizado)) || 0,
                            parseFloat(parseInputValue(formData.minimo)) || 0,
                            parseFloat(parseInputValue(formData.meta)) || 0,
                            currentKR.direction
                          ) : 0)
                        }}
                      />
                      <Input
                        type="text"
                        placeholder={
                          currentKR.type === 'moeda' || currentKR.type === 'currency'
                            ? 'Ex: R$ 1.000,00'
                            : currentKR.type === 'percentual' || currentKR.type === 'percentage'
                              ? 'Ex: 75%'
                              : 'Ex: 1000'
                        }
                        value={formData.realizado}
                        onChange={(e) => {
                          const v = e.target.value;
                          let formatted = v;
                          if (currentKR.type === 'moeda' || currentKR.type === 'currency') {
                            formatted = formatCurrencyInputLive(v);
                          } else if (currentKR.type === 'percentual' || currentKR.type === 'percentage') {
                            formatted = formatPercentageInputLive(v);
                          } else {
                            formatted = formatNumberInputLive(v);
                          }
                          setFormData({ ...formData, realizado: formatted });
                        }}
                        onBlur={() =>
                          setFormData({
                            ...formData,
                            realizado: formatInputValue(formData.realizado, currentKR.type),
                          })
                        }
                        className="mt-2 text-right"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    placeholder="Digite suas observações sobre este check-in..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveCheckin(e);
                    }}
                    className="flex-1"
                  >
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeDialog();
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}





