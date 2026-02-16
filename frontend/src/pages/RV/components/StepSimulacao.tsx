import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle,
  XCircle, Users, DollarSign, Award, Calendar, Play, Search, Filter,
  ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Percent, RefreshCw,
  ChevronsLeft, ChevronsRight, ChevronDown
} from 'lucide-react';
import api from '../../../api';
import ExportButton from './ExportButton';

interface Props {
  periodo: string;
  setPeriodo: (p: string) => void;
  regrasSelecionadas: number[]; // grupo IDs
  simulacao: any;
  setSimulacao: (s: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const MESES = [
  { value: '01', label: 'Janeiro' },  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },    { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },     { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },    { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

const TIPOS_CARGO: Record<string, { label: string; color: string; bg: string }> = {
  operador:       { label: 'Operador',       color: 'bg-blue-100 text-blue-700',    bg: 'bg-blue-50' },
  supervisor:     { label: 'Supervisor',     color: 'bg-emerald-100 text-emerald-700', bg: 'bg-emerald-50' },
  supervisor_ii:  { label: 'Supervisor II',  color: 'bg-teal-100 text-teal-700',    bg: 'bg-teal-50' },
  coordenador:    { label: 'Coordenador',    color: 'bg-purple-100 text-purple-700', bg: 'bg-purple-50' },
  gerente:        { label: 'Gerente',        color: 'bg-amber-100 text-amber-700',  bg: 'bg-amber-50' },
};

type SortField = 'nome' | 'cargo' | 'total_rv';
type SortDir = 'asc' | 'desc';
type FiltroEleg = 'todos' | 'elegiveis' | 'inelegiveis';

/* ══════════════════════════════════════════════════════════ */

export default function StepSimulacao({
  periodo: periodoInicial,
  setPeriodo: setPeriodoParent,
  regrasSelecionadas,
  simulacao,
  setSimulacao,
  onNext,
  onBack,
}: Props) {
  // Period
  const [periodoMes, setPeriodoMes] = useState(periodoInicial ? periodoInicial.split('-')[1] : '');
  const [periodoAno, setPeriodoAno] = useState(periodoInicial ? periodoInicial.split('-')[0] : '');
  const [periodos, setPeriodos] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedColab, setExpandedColab] = useState<string | null>(null);

  // Search / Filter / Sort
  const [busca, setBusca] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroEleg, setFiltroEleg] = useState<FiltroEleg>('todos');
  const [sortField, setSortField] = useState<SortField>('total_rv');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const periodoAtual = periodoMes && periodoAno ? `${periodoAno}-${periodoMes}` : '';

  // Fetch available periods
  useEffect(() => {
    api.get('/rv/periodos').then(res => {
      setPeriodos((res.data || []).map((p: any) => p.periodo));
    }).catch(() => {});
  }, []);

  // Reset filters when simulation changes
  useEffect(() => {
    setPage(0);
    setBusca('');
    setFiltroCargo('');
    setFiltroEleg('todos');
    setExpandedColab(null);
  }, [simulacao]);

  /* ── Execute simulation ── */
  const executarSimulacao = async () => {
    if (!periodoAtual) { setError('Selecione o período'); return; }
    setPeriodoParent(periodoAtual); // propagate to parent
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/rv/simular-grupo', {
        periodo: periodoAtual,
        grupoIds: regrasSelecionadas,
      });
      setSimulacao(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao executar simulação');
    } finally {
      setLoading(false);
    }
  };

  /* ── Filtered & sorted collaborators ── */
  const filteredColabs = useMemo(() => {
    if (!simulacao?.colaboradores) return [];
    let result = [...simulacao.colaboradores];

    // Search
    if (busca.trim()) {
      const term = busca.toLowerCase().trim();
      result = result.filter((c: any) =>
        c.nome?.toLowerCase().includes(term) || c.matricula?.toLowerCase().includes(term)
      );
    }

    // Cargo filter
    if (filtroCargo) {
      result = result.filter((c: any) => (c.cargo || '').toLowerCase() === filtroCargo.toLowerCase());
    }

    // Eligibility filter
    if (filtroEleg === 'elegiveis') {
      result = result.filter((c: any) => c.planos?.some((p: any) => p.elegibilidade_ok));
    } else if (filtroEleg === 'inelegiveis') {
      result = result.filter((c: any) => !c.planos?.some((p: any) => p.elegibilidade_ok));
    }

    // Sort
    result.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === 'nome') cmp = (a.nome || '').localeCompare(b.nome || '');
      else if (sortField === 'cargo') cmp = (a.cargo || '').localeCompare(b.cargo || '');
      else if (sortField === 'total_rv') cmp = (a.total_rv || 0) - (b.total_rv || 0);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [simulacao, busca, filtroCargo, filtroEleg, sortField, sortDir]);

  // Pagination
  const totalPages = pageSize > 0 ? Math.ceil(filteredColabs.length / pageSize) : 1;
  const pagedColabs = pageSize > 0 ? filteredColabs.slice(page * pageSize, (page + 1) * pageSize) : filteredColabs;

  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [busca, filtroCargo, filtroEleg, sortField, sortDir, pageSize]);

  /* ── Statistics ── */
  const stats = useMemo(() => {
    if (!simulacao?.colaboradores) return null;
    const colabs = simulacao.colaboradores;
    const rvs = colabs.map((c: any) => c.total_rv || 0);
    const rvsPositivos = rvs.filter((v: number) => v > 0);
    const sorted = [...rvsPositivos].sort((a: number, b: number) => a - b);

    const sum = rvs.reduce((s: number, v: number) => s + v, 0);
    const avg = rvs.length > 0 ? sum / rvs.length : 0;
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const min = sorted.length > 0 ? sorted[0] : 0;
    const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

    const elegiveis = colabs.filter((c: any) => c.planos?.some((p: any) => p.elegibilidade_ok)).length;

    return {
      avg: Math.round(avg * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      elegiveis,
      inelegiveis: colabs.length - elegiveis,
      taxaElegibilidade: colabs.length > 0 ? Math.round((elegiveis / colabs.length) * 100) : 0,
      comRV: rvsPositivos.length,
    };
  }, [simulacao]);

  /* ── Unique cargos for filter dropdown ── */
  const cargosUnicos = useMemo(() => {
    if (!simulacao?.colaboradores) return [];
    const set = new Set<string>();
    simulacao.colaboradores.forEach((c: any) => { if (c.cargo) set.add(c.cargo); });
    return Array.from(set).sort();
  }, [simulacao]);

  /* ── Export data builder ── */
  const buildExportData = () => {
    if (!simulacao) return { data: [], columns: [] };
    const { resumoPlanos } = simulacao;
    const planos = resumoPlanos || [];
    const source = filteredColabs; // export filtered data

    const data = source.map((c: any) => {
      const row: any = {
        matricula: c.matricula,
        nome: c.nome,
        cargo: c.cargo || '',
      };
      for (const p of planos) {
        const pc = (c.planos || []).find((cp: any) => cp.id_plano === p.id);
        const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo };
        const key = tc.label;
        row[`${key}_Eleg`] = pc ? (pc.elegibilidade_ok ? 'Sim' : 'Não') : '—';
        if (pc && pc.remuneracao) {
          for (const rem of pc.remuneracao) {
            row[`${key}_${rem.indicador_codigo}_Valor`] = rem.valor_indicador ?? '';
            row[`${key}_${rem.indicador_codigo}_Faixa`] = rem.faixa ? `${rem.faixa.min}–${rem.faixa.max ?? '∞'}` : '';
            row[`${key}_${rem.indicador_codigo}_Payout`] = rem.payout ?? 0;
          }
        }
        row[`${key}_RV`] = pc?.valor_rv ?? 0;
      }
      row['total_rv'] = c.total_rv || 0;
      return row;
    });

    const columns: { key: string; label: string }[] = [
      { key: 'matricula', label: 'Matrícula' },
      { key: 'nome', label: 'Colaborador' },
      { key: 'cargo', label: 'Cargo' },
    ];
    for (const p of planos) {
      const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo };
      const key = tc.label;
      columns.push({ key: `${key}_Eleg`, label: `${tc.label} - Elegível` });
      const firstColab = source[0];
      if (firstColab) {
        const pc = (firstColab.planos || []).find((cp: any) => cp.id_plano === p.id);
        if (pc?.remuneracao) {
          for (const rem of pc.remuneracao) {
            columns.push({ key: `${key}_${rem.indicador_codigo}_Valor`, label: `${tc.label} - ${rem.indicador_codigo} Valor` });
            columns.push({ key: `${key}_${rem.indicador_codigo}_Faixa`, label: `${tc.label} - ${rem.indicador_codigo} Faixa` });
            columns.push({ key: `${key}_${rem.indicador_codigo}_Payout`, label: `${tc.label} - ${rem.indicador_codigo} Payout (R$)` });
          }
        }
      }
      columns.push({ key: `${key}_RV`, label: `${tc.label} - Total RV (R$)` });
    }
    columns.push({ key: 'total_rv', label: 'Total RV (R$)' });

    return { data, columns };
  };

  /* ── Sort toggle helper ── */
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'nome' || field === 'cargo' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-nexus-muted/50" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-nexus-purple" />
      : <ArrowDown size={12} className="text-nexus-purple" />;
  };

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ═══════════════════════════════════════════════════════════
     RENDER: Period Selection (no simulation yet)
     ═══════════════════════════════════════════════════════════ */
  if (!simulacao && !loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-nexus-text">Simulação de Cálculo</h2>
              <p className="text-xs text-nexus-muted">Selecione o período e execute a simulação da RV com as regras selecionadas</p>
            </div>
          </div>

          {/* Period selector */}
          <div className="bg-nexus-bg rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-nexus-purple" />
              <label className="text-sm font-semibold text-nexus-text">Período de Cálculo</label>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Mês</label>
                <select value={periodoMes} onChange={e => setPeriodoMes(e.target.value)} className="w-full px-4 py-3 bg-white border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-purple/30 appearance-none cursor-pointer">
                  <option value="">Selecione o mês...</option>
                  {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Ano</label>
                <select value={periodoAno} onChange={e => setPeriodoAno(e.target.value)} className="w-full px-4 py-3 bg-white border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-purple/30 appearance-none cursor-pointer">
                  <option value="">Ano</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={executarSimulacao} disabled={!periodoAtual} className="px-6 py-3 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 whitespace-nowrap">
                <Play size={16} /> Simular
              </button>
            </div>

            {periodos.length > 0 && (
              <div>
                <p className="text-[10px] text-nexus-muted font-semibold uppercase mb-2">Períodos com dados disponíveis</p>
                <div className="flex flex-wrap gap-1.5">
                  {periodos.map(p => {
                    const [y, m] = p.split('-');
                    const mesLabel = MESES.find(ms => ms.value === m)?.label || m;
                    const isSelected = periodoAtual === p;
                    return (
                      <button key={p} onClick={() => { setPeriodoAno(y); setPeriodoMes(m); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected ? 'bg-nexus-purple text-white shadow-sm' : 'bg-white border border-nexus-border text-nexus-text hover:border-nexus-purple hover:text-nexus-purple'}`}>
                        {mesLabel}/{y}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary of selected rules */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs text-purple-700 font-medium">
              <Award size={14} className="inline mr-1" />
              {regrasSelecionadas.length} grupo(s) de regras selecionado(s) para simulação
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-nexus-muted border border-nexus-border hover:bg-nexus-bg transition-colors">
            <ChevronLeft size={16} /> Voltar
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER: Loading
     ═══════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 animate-ping opacity-20" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-nexus-text">Executando simulação...</p>
          <p className="text-xs text-nexus-muted mt-1">Calculando RV para {periodoAtual}</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER: Error (no simulation)
     ═══════════════════════════════════════════════════════════ */
  if (error && !simulacao) {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="card p-8 text-center">
          <AlertCircle size={32} className="text-nexus-danger mx-auto mb-3" />
          <p className="text-sm text-nexus-text font-medium">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={onBack} className="text-sm text-nexus-muted hover:text-nexus-text">← Voltar</button>
            <button onClick={() => { setSimulacao(null); setError(null); }} className="text-sm text-nexus-purple font-medium hover:underline">Escolher outro período</button>
          </div>
        </div>
      </div>
    );
  }

  if (!simulacao) return null;

  /* ═══════════════════════════════════════════════════════════
     RENDER: Results
     ═══════════════════════════════════════════════════════════ */
  const { colaboradores, totalRV, totalColaboradores, totalPlanos, resumoPlanos } = simulacao;
  const planos = resumoPlanos || [];
  const exportData = buildExportData();
  const periodoLabel = (() => {
    const [y, m] = periodoAtual.split('-');
    return `${MESES.find(ms => ms.value === m)?.label || m}/${y}`;
  })();

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ── Header ── */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-nexus-text">Simulação — {periodoLabel}</h2>
            <p className="text-[10px] text-nexus-muted">Simulação executada em {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <button
          onClick={() => { setSimulacao(null); setError(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-nexus-purple border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
        >
          <RefreshCw size={13} /> Nova Simulação
        </button>
      </div>

      {/* ── Summary cards row 1: main metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Users size={16} className="text-nexus-purple" />
          </div>
          <div>
            <p className="text-lg font-bold text-nexus-text">{totalColaboradores}</p>
            <p className="text-[10px] text-nexus-muted">Colaboradores</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Award size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-nexus-text">{totalPlanos}</p>
            <p className="text-[10px] text-nexus-muted">Sub-RVs</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Calendar size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-nexus-text">{periodoLabel}</p>
            <p className="text-[10px] text-nexus-muted">Período</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">R$ {fmtBRL(totalRV || 0)}</p>
            <p className="text-[10px] text-nexus-muted">Total RV</p>
          </div>
        </div>
      </div>

      {/* ── Summary cards row 2: statistics ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-nexus-text">R$ {fmtBRL(stats.avg)}</p>
              <p className="text-[10px] text-nexus-muted">Média por colaborador</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
              <BarChart3 size={16} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-nexus-text">R$ {fmtBRL(stats.median)}</p>
              <p className="text-[10px] text-nexus-muted">Mediana</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ArrowUpDown size={16} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-nexus-text">
                R$ {fmtBRL(stats.min)} <span className="text-[10px] text-nexus-muted font-normal">—</span> R$ {fmtBRL(stats.max)}
              </p>
              <p className="text-[10px] text-nexus-muted">Min — Máx (c/ RV)</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Percent size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <p className="text-sm font-bold text-emerald-600">{stats.taxaElegibilidade}%</p>
                <p className="text-[10px] text-nexus-muted">({stats.elegiveis}/{totalColaboradores})</p>
              </div>
              <p className="text-[10px] text-nexus-muted">Taxa de elegibilidade</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-RV breakdown badges ── */}
      {planos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {planos.map((p: any) => {
            const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo, color: 'bg-gray-100 text-gray-700' };
            return (
              <div key={p.id} className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 ${tc.color}`}>
                <span>{tc.label}</span>
                <span className="font-bold">R$ {fmtBRL(p.total || 0)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Results table card ── */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-nexus-border space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-nexus-purple" />
              <h3 className="text-sm font-semibold text-nexus-text">Resultado por Colaborador</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-nexus-bg text-nexus-muted font-medium">
                {filteredColabs.length} de {totalColaboradores}
              </span>
            </div>
            <ExportButton data={exportData.data} columns={exportData.columns} filename={`rv_simulacao_${periodoAtual}`} />
          </div>

          {/* Search + Filters row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome ou matrícula..."
                className="w-full pl-8 pr-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
              />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-nexus-text">
                  <XCircle size={14} />
                </button>
              )}
            </div>

            {/* Cargo filter */}
            {cargosUnicos.length > 0 && (
              <select
                value={filtroCargo}
                onChange={e => setFiltroCargo(e.target.value)}
                className="px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30 appearance-none cursor-pointer min-w-[140px]"
              >
                <option value="">Todos os cargos</option>
                {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Eligibility filter */}
            <div className="flex rounded-lg border border-nexus-border overflow-hidden">
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'elegiveis', label: 'Elegíveis' },
                { value: 'inelegiveis', label: 'Inelegíveis' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFiltroEleg(opt.value as FiltroEleg)}
                  className={`px-3 py-2 text-[10px] font-semibold transition-colors ${
                    filtroEleg === opt.value
                      ? 'bg-nexus-purple text-white'
                      : 'bg-nexus-bg text-nexus-muted hover:text-nexus-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {pagedColabs.length === 0 ? (
          <div className="p-8 text-center">
            <Filter size={24} className="text-nexus-muted/30 mx-auto mb-2" />
            <p className="text-sm text-nexus-muted">Nenhum colaborador encontrado com os filtros aplicados</p>
            <button onClick={() => { setBusca(''); setFiltroCargo(''); setFiltroEleg('todos'); }} className="text-xs text-nexus-purple font-medium mt-2 hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-nexus-bg border-b border-nexus-border">
                  <th
                    className="text-left p-3 font-semibold text-nexus-muted text-xs sticky left-0 bg-nexus-bg z-10 min-w-[200px] cursor-pointer select-none hover:text-nexus-text transition-colors"
                    onClick={() => toggleSort('nome')}
                  >
                    <div className="flex items-center gap-1">
                      Colaborador <SortIcon field="nome" />
                    </div>
                  </th>
                  {planos.map((p: any) => {
                    const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo, color: '' };
                    return (
                      <th key={p.id} className="text-center p-2 font-semibold text-xs border-l border-nexus-border min-w-[140px]">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${tc.color}`}>{tc.label}</span>
                      </th>
                    );
                  })}
                  <th
                    className="text-right p-3 font-semibold text-xs text-nexus-text border-l-2 border-nexus-border bg-nexus-bg min-w-[120px] cursor-pointer select-none hover:text-nexus-purple transition-colors"
                    onClick={() => toggleSort('total_rv')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total RV <SortIcon field="total_rv" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedColabs.map((colab: any, idx: number) => (
                  <React.Fragment key={colab.matricula}>
                    <tr
                      className={`border-b border-nexus-borderLight hover:bg-purple-50/30 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-nexus-bg/20'}`}
                      onClick={() => setExpandedColab(expandedColab === colab.matricula ? null : colab.matricula)}
                    >
                      <td className="p-3 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <ChevronDown size={14} className={`text-nexus-muted transition-transform flex-shrink-0 ${expandedColab === colab.matricula ? 'rotate-180' : ''}`} />
                          <div>
                            <p className="font-medium text-nexus-text whitespace-nowrap">{colab.nome}</p>
                            <p className="text-[10px] text-nexus-muted">{colab.matricula}{colab.cargo ? ` · ${colab.cargo}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      {planos.map((p: any) => {
                        const pc = (colab.planos || []).find((cp: any) => cp.id_plano === p.id);
                        if (!pc) return <td key={p.id} className="p-2 text-center border-l border-nexus-borderLight text-nexus-muted text-xs">—</td>;
                        return (
                          <td key={p.id} className="p-2 text-center border-l border-nexus-borderLight">
                            {!pc.elegibilidade_ok ? (
                              <div className="flex items-center justify-center gap-1">
                                <XCircle size={12} className="text-red-400" />
                                <span className="text-[10px] text-red-400">Inelegível</span>
                              </div>
                            ) : (
                              <span className={`font-bold ${pc.valor_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>
                                R$ {fmtBRL(pc.valor_rv || 0)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-right font-bold border-l-2 border-nexus-border">
                        <span className={colab.total_rv > 0 ? 'text-nexus-purple text-base' : 'text-nexus-muted'}>
                          R$ {fmtBRL(colab.total_rv || 0)}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedColab === colab.matricula && (
                      <tr className="bg-purple-50/30">
                        <td colSpan={planos.length + 2} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(colab.planos || []).map((pc: any) => {
                              const tc = TIPOS_CARGO[pc.tipo_cargo] || { label: pc.tipo_cargo, color: 'bg-gray-100 text-gray-700' };
                              return (
                                <div key={pc.id_plano} className="bg-white rounded-xl border border-nexus-border p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tc.color}`}>{tc.label}</span>
                                    <span className={`text-sm font-bold ${pc.valor_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>
                                      R$ {fmtBRL(pc.valor_rv || 0)}
                                    </span>
                                  </div>

                                  {/* Elegibilidade */}
                                  {pc.elegibilidade && pc.elegibilidade.length > 0 && (
                                    <div className="text-[10px] space-y-0.5">
                                      <p className="font-semibold text-nexus-muted uppercase">Elegibilidade</p>
                                      {pc.elegibilidade.map((e: any, ei: number) => (
                                        <div key={ei} className="flex items-center gap-1">
                                          {e.passou ? <CheckCircle size={10} className="text-emerald-500" /> : <XCircle size={10} className="text-red-400" />}
                                          <span>{e.indicador} {e.operador} {e.ref}</span>
                                          <span className="text-nexus-muted ml-auto">{e.valor != null ? `(${e.valor})` : '—'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Remuneração detail */}
                                  {pc.remuneracao && pc.remuneracao.length > 0 && (
                                    <div className="text-[10px] space-y-0.5">
                                      <p className="font-semibold text-nexus-muted uppercase">Remuneração</p>
                                      {pc.remuneracao.map((rem: any, ri: number) => (
                                        <div key={ri} className="flex items-center justify-between">
                                          <span className="font-medium">{rem.indicador_codigo}</span>
                                          <span className="text-nexus-muted">{rem.valor_indicador != null ? `${rem.valor_indicador}%` : '—'}</span>
                                          <span>{rem.faixa ? `${rem.faixa.min}–${rem.faixa.max ?? '∞'}` : 'fora'}</span>
                                          <span className={rem.payout > 0 ? 'text-emerald-600 font-bold' : 'text-nexus-muted'}>
                                            R$ {fmtBRL(rem.payout || 0)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {pc.tipo_calculo !== 'faixas' && (
                                    <p className="text-[10px] text-indigo-600 italic">
                                      Cálculo: {pc.tipo_calculo === 'percentual_rv' ? '% de outra RV' : pc.tipo_calculo === 'valor_rv' ? 'Valor de outra RV' : '% Faturamento'}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-purple-50 to-blue-50 font-bold">
                  <td className="p-3 text-nexus-text sticky left-0 bg-gradient-to-r from-purple-50 to-purple-50 z-10">
                    TOTAL
                    {filteredColabs.length < totalColaboradores && (
                      <span className="text-[10px] font-normal text-nexus-muted ml-1">
                        ({filteredColabs.length} filtrados)
                      </span>
                    )}
                  </td>
                  {planos.map((p: any) => {
                    // Calculate filtered total per plano
                    const filteredTotal = filteredColabs.reduce((s: number, c: any) => {
                      const pc = (c.planos || []).find((cp: any) => cp.id_plano === p.id);
                      return s + (pc?.valor_rv || 0);
                    }, 0);
                    return (
                      <td key={p.id} className="p-2 text-center border-l border-nexus-borderLight text-nexus-purple font-bold">
                        R$ {fmtBRL(filteredTotal)}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right text-lg text-nexus-purple border-l-2 border-nexus-border">
                    R$ {fmtBRL(filteredColabs.reduce((s: number, c: any) => s + (c.total_rv || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredColabs.length > 10 && (
          <div className="p-3 border-t border-nexus-border flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-nexus-muted">Exibir:</span>
              {[10, 25, 50, 0].map(size => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                    pageSize === size ? 'bg-nexus-purple text-white' : 'bg-nexus-bg text-nexus-muted hover:text-nexus-text'
                  }`}
                >
                  {size === 0 ? 'Todos' : size}
                </button>
              ))}
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(0)} disabled={page === 0} className="p-1 rounded text-nexus-muted hover:text-nexus-text disabled:opacity-30">
                  <ChevronsLeft size={14} />
                </button>
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 rounded text-nexus-muted hover:text-nexus-text disabled:opacity-30">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] text-nexus-muted px-2">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredColabs.length)} de {filteredColabs.length}
                </span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-1 rounded text-nexus-muted hover:text-nexus-text disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="p-1 rounded text-nexus-muted hover:text-nexus-text disabled:opacity-30">
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-nexus-muted px-1">
        <div className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /><span>Elegível</span></div>
        <div className="flex items-center gap-1"><XCircle size={12} className="text-red-400" /><span>Inelegível</span></div>
        <span>Clique em um colaborador para ver detalhes do cálculo</span>
      </div>

      {/* ── Navigation ── */}
      <div className="flex justify-between">
        <button
          onClick={() => { setSimulacao(null); setError(null); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-nexus-muted border border-nexus-border hover:bg-nexus-bg transition-colors"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!simulacao}
          className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          Avançar <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
