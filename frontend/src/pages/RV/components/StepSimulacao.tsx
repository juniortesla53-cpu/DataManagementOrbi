import React, { useState, useEffect } from 'react';
import {
  BarChart3, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle,
  XCircle, Users, DollarSign, Award, Calendar, Play
} from 'lucide-react';
import api from '../../../api';
import ExportButton from './ExportButton';

interface Props {
  periodo: string;
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

const TIPOS_CARGO: Record<string, { label: string; color: string }> = {
  operador: { label: 'Operador', color: 'bg-blue-100 text-blue-700' },
  supervisor: { label: 'Supervisor', color: 'bg-emerald-100 text-emerald-700' },
  supervisor_ii: { label: 'Supervisor II', color: 'bg-teal-100 text-teal-700' },
  coordenador: { label: 'Coordenador', color: 'bg-purple-100 text-purple-700' },
  gerente: { label: 'Gerente', color: 'bg-amber-100 text-amber-700' },
};

export default function StepSimulacao({ periodo: periodoInicial, regrasSelecionadas, simulacao, setSimulacao, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodoMes, setPeriodoMes] = useState(periodoInicial ? periodoInicial.split('-')[1] : '');
  const [periodoAno, setPeriodoAno] = useState(periodoInicial ? periodoInicial.split('-')[0] : '');
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [expandedColab, setExpandedColab] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const periodoAtual = periodoMes && periodoAno ? `${periodoAno}-${periodoMes}` : '';

  // Fetch available periods
  useEffect(() => {
    api.get('/rv/periodos').then(res => {
      setPeriodos((res.data || []).map((p: any) => p.periodo));
    }).catch(() => {});
  }, []);

  const executarSimulacao = async () => {
    if (!periodoAtual) { setError('Selecione o período'); return; }
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

  // Build export data
  const buildExportData = () => {
    if (!simulacao) return { data: [], columns: [] };
    const { colaboradores, resumoPlanos } = simulacao;
    const planos = resumoPlanos || [];

    const data = (colaboradores || []).map((c: any) => {
      const row: any = {
        matricula: c.matricula,
        nome: c.nome,
        cargo: c.cargo || '',
      };
      for (const p of planos) {
        const pc = (c.planos || []).find((cp: any) => cp.id_plano === p.id);
        const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo };
        const key = `${tc.label}`;
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

    // Build columns dynamically
    const columns: { key: string; label: string }[] = [
      { key: 'matricula', label: 'Matrícula' },
      { key: 'nome', label: 'Colaborador' },
      { key: 'cargo', label: 'Cargo' },
    ];
    for (const p of planos) {
      const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo };
      const key = `${tc.label}`;
      columns.push({ key: `${key}_Eleg`, label: `${tc.label} - Elegível` });
      // Add indicator columns from first collaborator's data
      const firstColab = (colaboradores || [])[0];
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

  // ── Period selection + Run button ──
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
              <p className="text-xs text-nexus-muted">Selecione o período e execute a simulação da RV</p>
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
            <p className="text-xs text-purple-700 font-medium">{regrasSelecionadas.length} grupo(s) de regras selecionado(s)</p>
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

  // ── Loading ──
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

  // ── Error ──
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

  // ── Results ──
  const { colaboradores, totalRV, totalColaboradores, totalPlanos, resumoPlanos } = simulacao;
  const planos = resumoPlanos || [];
  const exportData = buildExportData();

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-nexus-purple" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">{totalColaboradores}</p>
            <p className="text-[10px] text-nexus-muted">Colaboradores</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Award size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">{totalPlanos}</p>
            <p className="text-[10px] text-nexus-muted">Sub-RVs</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Calendar size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-nexus-text">{periodoAtual}</p>
            <p className="text-[10px] text-nexus-muted">Período</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-600">
              R$ {(totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-nexus-muted">Total RV</p>
          </div>
        </div>
      </div>

      {/* Summary per sub-RV */}
      {planos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {planos.map((p: any) => {
            const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo, color: 'bg-gray-100 text-gray-700' };
            return (
              <div key={p.id} className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 ${tc.color}`}>
                <span>{tc.label}</span>
                <span className="font-bold">R$ {(p.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Results table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-nexus-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-nexus-purple" />
            <h3 className="text-sm font-semibold text-nexus-text">Resultado da Simulação — {periodoAtual}</h3>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton data={exportData.data} columns={exportData.columns} filename={`rv_simulacao_${periodoAtual}`} />
            <button onClick={() => { setSimulacao(null); setError(null); }} className="text-xs font-medium text-nexus-purple hover:underline">↻ Nova simulação</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-nexus-bg border-b border-nexus-border">
                <th className="text-left p-3 font-semibold text-nexus-muted text-xs sticky left-0 bg-nexus-bg z-10 min-w-[200px]">Colaborador</th>
                {planos.map((p: any) => {
                  const tc = TIPOS_CARGO[p.tipo_cargo] || { label: p.tipo_cargo, color: '' };
                  return (
                    <th key={p.id} className="text-center p-2 font-semibold text-xs border-l border-nexus-border min-w-[140px]">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${tc.color}`}>{tc.label}</span>
                    </th>
                  );
                })}
                <th className="text-right p-3 font-semibold text-xs text-nexus-text border-l-2 border-nexus-border bg-nexus-bg min-w-[120px]">Total RV</th>
              </tr>
            </thead>
            <tbody>
              {(colaboradores || []).map((colab: any, idx: number) => (
                <React.Fragment key={colab.matricula}>
                  <tr className={`border-b border-nexus-borderLight hover:bg-purple-50/30 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-nexus-bg/20'}`}
                    onClick={() => setExpandedColab(expandedColab === colab.matricula ? null : colab.matricula)}>
                    <td className="p-3 sticky left-0 bg-inherit z-10">
                      <p className="font-medium text-nexus-text whitespace-nowrap">{colab.nome}</p>
                      <p className="text-[10px] text-nexus-muted">{colab.matricula}{colab.cargo ? ` · ${colab.cargo}` : ''}</p>
                    </td>
                    {planos.map((p: any) => {
                      const pc = (colab.planos || []).find((cp: any) => cp.id_plano === p.id);
                      if (!pc) return <td key={p.id} className="p-2 text-center border-l border-nexus-borderLight text-nexus-muted text-xs">—</td>;
                      return (
                        <td key={p.id} className="p-2 text-center border-l border-nexus-borderLight">
                          <div className="flex flex-col items-center gap-1">
                            {!pc.elegibilidade_ok ? (
                              <div className="flex items-center gap-1"><XCircle size={12} className="text-red-400" /><span className="text-[10px] text-red-400">Inelegível</span></div>
                            ) : (
                              <span className={`font-bold ${pc.valor_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>
                                R$ {(pc.valor_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-right font-bold border-l-2 border-nexus-border">
                      <span className={colab.total_rv > 0 ? 'text-nexus-purple text-base' : 'text-nexus-muted'}>
                        R$ {(colab.total_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                  <span className={`text-sm font-bold ${pc.valor_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>R$ {(pc.valor_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                                        <span className={rem.payout > 0 ? 'text-emerald-600 font-bold' : 'text-nexus-muted'}>R$ {(rem.payout || 0).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {pc.tipo_calculo !== 'faixas' && (
                                  <p className="text-[10px] text-indigo-600 italic">Cálculo: {pc.tipo_calculo === 'percentual_rv' ? '% de outra RV' : pc.tipo_calculo === 'valor_rv' ? 'Valor de outra RV' : '% Faturamento'}</p>
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
                <td className="p-3 text-nexus-text sticky left-0 bg-gradient-to-r from-purple-50 to-purple-50 z-10">TOTAL</td>
                {planos.map((p: any) => (
                  <td key={p.id} className="p-2 text-center border-l border-nexus-borderLight text-nexus-purple font-bold">
                    R$ {(p.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                ))}
                <td className="p-3 text-right text-lg text-nexus-purple border-l-2 border-nexus-border">
                  R$ {(totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-nexus-muted px-1">
        <div className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /><span>Elegível</span></div>
        <div className="flex items-center gap-1"><XCircle size={12} className="text-red-400" /><span>Inelegível</span></div>
        <span>Clique em um colaborador para ver detalhes</span>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => { setSimulacao(null); setError(null); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-nexus-muted border border-nexus-border hover:bg-nexus-bg transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <button onClick={onNext} disabled={!simulacao} className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-40">
          Confirmar <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
