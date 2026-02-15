import { useState, useEffect } from 'react';
import { 
  ChevronRight, ChevronLeft, Plus, Edit2, Trash2, X, Loader2,
  DollarSign, AlertCircle, Award, TrendingDown, Shield, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import api from '../../../api';

interface Props {
  clienteIds: number[];
  regrasSelecionadas: number[];
  setRegrasSelecionadas: (r: number[]) => void;
  onNext: () => void;
  onBack: () => void;
}

/* ── Helper: Custom month picker ────────────────────────────── */
const MESES = [
  { value: '01', label: 'Janeiro' },  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },    { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },     { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },    { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

function MonthYearPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);
  const [month, setMonth] = useState(value ? value.split('-')[1] : '');
  const [year, setYear] = useState(value ? value.split('-')[0] : '');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      setYear(parts[0] || '');
      setMonth(parts[1] || '');
    }
  }, [value]);

  const handleChange = (newMonth: string, newYear: string) => {
    if (newMonth && newYear) {
      onChange(`${newYear}-${newMonth}`);
    } else if (!newMonth && !newYear) {
      onChange('');
    }
  };

  return (
    <div>
      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">{label}</label>
      <div className="flex gap-2">
        <select
          value={month}
          onChange={e => { setMonth(e.target.value); handleChange(e.target.value, year); }}
          className="flex-1 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30 appearance-none cursor-pointer"
        >
          <option value="">Mês</option>
          {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          value={year}
          onChange={e => { setYear(e.target.value); handleChange(month, e.target.value); }}
          className="w-24 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30 appearance-none cursor-pointer"
        >
          <option value="">Ano</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ── Helper: get unit label for faixa based on indicator ────── */
function getUnidadeLabel(indicadores: any[], idIndicador: number | string): string {
  const ind = indicadores.find(i => i.id === Number(idIndicador));
  if (!ind) return '';
  return ind.unidade || '';
}

function getFaixaPlaceholder(indicadores: any[], idIndicador: number | string): { minLabel: string; maxLabel: string } {
  const ind = indicadores.find(i => i.id === Number(idIndicador));
  if (!ind) return { minLabel: 'Mín', maxLabel: 'Máx' };
  const u = ind.unidade || '';
  if (u === '%') return { minLabel: 'Mín %', maxLabel: 'Máx %' };
  if (u === 'R$') return { minLabel: 'Mín R$', maxLabel: 'Máx R$' };
  if (u === 'un') return { minLabel: 'Mín un', maxLabel: 'Máx un' };
  if (u === 's') return { minLabel: 'Mín seg', maxLabel: 'Máx seg' };
  return { minLabel: `Mín (${u})`, maxLabel: `Máx (${u})` };
}

/* ── Step section component ─────────────────────────────────── */
interface StepSectionProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  completed?: boolean;
  children: React.ReactNode;
}

function StepSection({ stepNumber, title, subtitle, icon, expanded, onToggle, completed, children }: StepSectionProps) {
  return (
    <div className="relative">
      {/* Step header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border ${
          expanded
            ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-sm'
            : completed
              ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
              : 'bg-white border-nexus-border hover:border-purple-200 hover:bg-purple-50/20'
        }`}
      >
        {/* Step circle */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          expanded
            ? 'bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/25'
            : completed
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-nexus-bg border-2 border-nexus-border text-nexus-muted'
        }`}>
          {completed && !expanded ? <Check size={18} strokeWidth={3} /> : (
            <span className="text-sm font-bold">{stepNumber}</span>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            {icon}
            <p className={`text-sm font-semibold ${
              expanded ? 'text-nexus-purple' : completed ? 'text-emerald-700' : 'text-nexus-text'
            }`}>{title}</p>
          </div>
          <p className={`text-[10px] mt-0.5 ${
            expanded ? 'text-purple-500' : 'text-nexus-muted'
          }`}>{subtitle}</p>
        </div>

        {/* Chevron */}
        <div className={`flex-shrink-0 ${expanded ? 'text-nexus-purple' : 'text-nexus-muted'}`}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Step content */}
      {expanded && (
        <div className="mt-2 ml-5 pl-9 border-l-2 border-purple-200 pb-2 animate-fadeIn">
          <div className="bg-white rounded-xl border border-nexus-border p-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */

export default function StepRegras({ clienteIds, regrasSelecionadas, setRegrasSelecionadas, onNext, onBack }: Props) {
  const [planos, setPlanos] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('identificacao');

  const emptyForm = {
    nome: '',
    descricao: '',
    vigencia_inicio: '',
    vigencia_fim: '',
    valor_dsr: 0,
    teto_rv: null as number | null,
    tem_teto: false,
    elegibilidade: [] as any[],
    remuneracao: [] as any[],
    deflatores: [] as any[],
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = clienteIds.length > 0 ? `?id_cliente=${clienteIds[0]}` : '';
      const [planosRes, indRes] = await Promise.all([
        api.get(`/rv/planos${params}`),
        api.get(`/rv/indicadores${params}`)
      ]);
      setPlanos(planosRes.data);
      setIndicadores(indRes.data.filter((i: any) => i.ativo));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [clienteIds]);

  const openNew = () => {
    setForm({
      ...emptyForm,
      remuneracao: indicadores.map((ind, idx) => ({
        id_indicador: ind.id,
        indicador_codigo: ind.codigo,
        indicador_nome: ind.nome,
        indicador_unidade: ind.unidade,
        indicador_tipo: ind.tipo,
        tem_regra_propria: false,
        faixas: [],
        ordem: idx,
      })),
    });
    setModal('new');
    setExpandedSection('identificacao');
  };

  const openEdit = async (plano: any) => {
    try {
      const res = await api.get(`/rv/planos/${plano.id}`);
      const data = res.data;

      const allRemuneracao = indicadores.map((ind, idx) => {
        const existing = data.remuneracao.find((r: any) => r.id_indicador === ind.id);
        return existing
          ? { ...existing, indicador_unidade: ind.unidade, indicador_tipo: ind.tipo }
          : {
              id_indicador: ind.id,
              indicador_codigo: ind.codigo,
              indicador_nome: ind.nome,
              indicador_unidade: ind.unidade,
              indicador_tipo: ind.tipo,
              tem_regra_propria: false,
              faixas: [],
              ordem: idx,
            };
      });

      setForm({
        nome: data.nome,
        descricao: data.descricao || '',
        vigencia_inicio: data.vigencia_inicio || '',
        vigencia_fim: data.vigencia_fim || '',
        valor_dsr: data.valor_dsr || 0,
        teto_rv: data.teto_rv,
        tem_teto: !!data.teto_rv,
        elegibilidade: data.elegibilidade || [],
        remuneracao: allRemuneracao,
        deflatores: data.deflatores || [],
      });
      setModal(plano.id);
      setExpandedSection('identificacao');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao carregar regra');
    }
  };

  const save = async () => {
    if (!form.nome) { alert('Nome da regra é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        vigencia_inicio: form.vigencia_inicio || null,
        vigencia_fim: form.vigencia_fim || null,
        valor_dsr: parseFloat(form.valor_dsr as any) || 0,
        teto_rv: form.tem_teto ? (parseFloat(form.teto_rv as any) || null) : null,
        id_cliente: clienteIds[0] || null,
        elegibilidade: form.elegibilidade.map((e, idx) => ({
          id_indicador: parseInt(e.id_indicador),
          operador: e.operador,
          valor_minimo: parseFloat(e.valor_minimo),
          ordem: idx,
        })),
        remuneracao: form.remuneracao
          .filter(r => r.tem_regra_propria)
          .map((r, idx) => ({
            id_indicador: parseInt(r.id_indicador),
            tem_regra_propria: 1,
            ordem: idx,
            faixas: (r.faixas || []).map((f: any, fIdx: number) => ({
              faixa_min: parseFloat(f.faixa_min),
              faixa_max: f.faixa_max ? parseFloat(f.faixa_max) : null,
              valor_payout: parseFloat(f.valor_payout),
              tipo_payout: f.tipo_payout,
              ordem: fIdx,
            })),
          })),
        deflatores: form.deflatores.map((d, idx) => ({
          id_indicador: parseInt(d.id_indicador),
          ordem: idx,
          faixas: (d.faixas || []).map((f: any, fIdx: number) => ({
            faixa_min: parseFloat(f.faixa_min),
            faixa_max: f.faixa_max ? parseFloat(f.faixa_max) : null,
            percentual_reducao: parseFloat(f.percentual_reducao),
            ordem: fIdx,
          })),
        })),
      };

      if (modal === 'new') {
        const res = await api.post('/rv/planos', payload);
        setRegrasSelecionadas([...regrasSelecionadas, res.data.id]);
      } else {
        await api.put(`/rv/planos/${modal}`, { ...payload, ativo: 1 });
      }
      setModal(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar esta regra?')) return;
    try {
      await api.delete(`/rv/planos/${id}`);
      setRegrasSelecionadas(regrasSelecionadas.filter(r => r !== id));
      fetchData();
    } catch {}
  };

  /* ── Elegibilidade ── */
  const addElegibilidade = () => {
    setForm({ ...form, elegibilidade: [...form.elegibilidade, { id_indicador: '', operador: '>=', valor_minimo: 0 }] });
  };
  const removeElegibilidade = (idx: number) => {
    setForm({ ...form, elegibilidade: form.elegibilidade.filter((_, i) => i !== idx) });
  };
  const updateElegibilidade = (idx: number, field: string, value: any) => {
    const updated = [...form.elegibilidade];
    (updated[idx] as any)[field] = value;
    setForm({ ...form, elegibilidade: updated });
  };

  /* ── Remuneração ── */
  const toggleRegrasProprias = (idx: number) => {
    const updated = [...form.remuneracao];
    updated[idx].tem_regra_propria = !updated[idx].tem_regra_propria;
    if (!updated[idx].tem_regra_propria) updated[idx].faixas = [];
    setForm({ ...form, remuneracao: updated });
  };
  const addFaixa = (remIdx: number) => {
    const updated = [...form.remuneracao];
    if (!updated[remIdx].faixas) updated[remIdx].faixas = [];
    updated[remIdx].faixas.push({ faixa_min: 0, faixa_max: null, valor_payout: 0, tipo_payout: 'valor_fixo' });
    setForm({ ...form, remuneracao: updated });
  };
  const removeFaixa = (remIdx: number, faixaIdx: number) => {
    const updated = [...form.remuneracao];
    updated[remIdx].faixas = updated[remIdx].faixas.filter((_: any, i: number) => i !== faixaIdx);
    setForm({ ...form, remuneracao: updated });
  };
  const updateFaixa = (remIdx: number, faixaIdx: number, field: string, value: any) => {
    const updated = [...form.remuneracao];
    (updated[remIdx].faixas[faixaIdx] as any)[field] = value;
    setForm({ ...form, remuneracao: updated });
  };

  /* ── Deflatores ── */
  const addDeflator = () => {
    setForm({ ...form, deflatores: [...form.deflatores, { id_indicador: '', faixas: [] }] });
  };
  const removeDeflator = (idx: number) => {
    setForm({ ...form, deflatores: form.deflatores.filter((_, i) => i !== idx) });
  };
  const updateDeflator = (idx: number, field: string, value: any) => {
    const updated = [...form.deflatores];
    (updated[idx] as any)[field] = value;
    setForm({ ...form, deflatores: updated });
  };
  const addDeflatorFaixa = (defIdx: number) => {
    const updated = [...form.deflatores];
    if (!updated[defIdx].faixas) updated[defIdx].faixas = [];
    updated[defIdx].faixas.push({ faixa_min: 0, faixa_max: null, percentual_reducao: 0 });
    setForm({ ...form, deflatores: updated });
  };
  const removeDeflatorFaixa = (defIdx: number, faixaIdx: number) => {
    const updated = [...form.deflatores];
    updated[defIdx].faixas = updated[defIdx].faixas.filter((_: any, i: number) => i !== faixaIdx);
    setForm({ ...form, deflatores: updated });
  };
  const updateDeflatorFaixa = (defIdx: number, faixaIdx: number, field: string, value: any) => {
    const updated = [...form.deflatores];
    (updated[defIdx].faixas[faixaIdx] as any)[field] = value;
    setForm({ ...form, deflatores: updated });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  /* ── Check section completeness ── */
  const isIdentDone = !!form.nome;
  const isDsrDone = form.valor_dsr > 0;
  const isElegDone = form.elegibilidade.length > 0 && form.elegibilidade.every(e => e.id_indicador);
  const isRemDone = form.remuneracao.some(r => r.tem_regra_propria && r.faixas?.length > 0);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-nexus-purple" /></div>;
  }

  if (error) {
    return (
      <div className="card p-10 text-center space-y-4">
        <AlertCircle size={32} className="mx-auto text-red-500" />
        <p className="text-sm text-nexus-muted">{error}</p>
        <button onClick={onBack} className="text-xs text-nexus-muted hover:text-nexus-text underline">← Voltar</button>
      </div>
    );
  }

  const ativosPlanos = planos.filter(p => p.ativo);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-nexus-text">Regras de Remuneração Variável</h3>
            <p className="text-[10px] text-nexus-muted mt-0.5">Configure a composição completa do RV com DSR, elegibilidade, remuneração, teto e deflatores.</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 btn-gradient rounded-lg text-xs font-semibold">
            <Plus size={14} /> Nova Regra
          </button>
        </div>
      </div>

      {/* Lista de regras */}
      <div className="grid gap-3">
        {ativosPlanos.map(plano => {
          const selecionado = regrasSelecionadas.includes(plano.id);
          return (
            <div
              key={plano.id}
              className={`card p-4 cursor-pointer transition-all ${selecionado ? 'ring-2 ring-nexus-purple/40 bg-purple-50/30' : 'hover:border-nexus-purple/30'}`}
              onClick={() => {
                if (selecionado) setRegrasSelecionadas(regrasSelecionadas.filter(id => id !== plano.id));
                else setRegrasSelecionadas([...regrasSelecionadas, plano.id]);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className={`text-sm font-semibold ${selecionado ? 'text-nexus-purple' : 'text-nexus-text'}`}>{plano.nome}</h4>
                    {plano.valor_dsr > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">DSR: {plano.valor_dsr}%</span>
                    )}
                    {plano.teto_rv && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Teto: R$ {plano.teto_rv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                  {plano.descricao && <p className="text-[11px] text-nexus-muted">{plano.descricao}</p>}
                  <div className="text-[10px] text-nexus-muted mt-2">
                    Vigência: {plano.vigencia_inicio || '—'} até {plano.vigencia_fim || '—'}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(plano)} className="p-1.5 text-nexus-muted hover:text-nexus-purple transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => remove(plano.id)} className="p-1.5 text-nexus-muted hover:text-nexus-danger transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {ativosPlanos.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-nexus-muted">Nenhuma regra cadastrada. Crie a primeira regra para continuar.</p>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-nexus-textSecondary bg-nexus-bg border border-nexus-border hover:border-nexus-muted transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <button onClick={onNext} disabled={regrasSelecionadas.length === 0} className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none">
          Próximo <ChevronRight size={16} />
        </button>
      </div>

      {/* ══════════ Modal criar/editar regra ══════════ */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-modal animate-scaleIn my-8" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-nexus-border">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-nexus-text text-base">{modal === 'new' ? 'Nova Regra RV' : 'Editar Regra RV'}</h2>
                  <p className="text-[10px] text-nexus-muted mt-1">Configure todos os componentes da remuneração variável</p>
                </div>
                <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text p-1"><X size={20} /></button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">

              {/* ── Steps ── */}
              <div className="space-y-3">

                {/* STEP 0: Identificação */}
                <StepSection
                  stepNumber={0}
                  title="Identificação e Vigência"
                  subtitle="Nome da regra, descrição e período de vigência"
                  icon={<Edit2 size={15} className="text-indigo-600" />}
                  expanded={expandedSection === 'identificacao'}
                  onToggle={() => toggleSection('identificacao')}
                  completed={isIdentDone && expandedSection !== 'identificacao'}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Nome da Regra *</label>
                      <input
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        className="w-full px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
                        placeholder="Ex: Regra Comercial 2026"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Descrição</label>
                      <input
                        value={form.descricao}
                        onChange={e => setForm({ ...form, descricao: e.target.value })}
                        className="w-full px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
                        placeholder="Descrição opcional"
                      />
                    </div>
                    <MonthYearPicker label="Vigência Início" value={form.vigencia_inicio} onChange={v => setForm({ ...form, vigencia_inicio: v })} />
                    <MonthYearPicker label="Vigência Fim" value={form.vigencia_fim} onChange={v => setForm({ ...form, vigencia_fim: v })} />
                  </div>
                </StepSection>

                {/* STEP 1: DSR */}
                <StepSection
                  stepNumber={1}
                  title="Valor da DSR"
                  subtitle="Descanso Semanal Remunerado — percentual aplicado sobre o valor da RV"
                  icon={<DollarSign size={15} className="text-emerald-600" />}
                  expanded={expandedSection === 'dsr'}
                  onToggle={() => toggleSection('dsr')}
                  completed={isDsrDone && expandedSection !== 'dsr'}
                >
                  <div>
                    <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Valor %</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={form.valor_dsr}
                        onChange={e => setForm({ ...form, valor_dsr: parseFloat(e.target.value) || 0 })}
                        className="w-32 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        placeholder="0.00"
                      />
                      <span className="text-sm text-nexus-muted font-medium">%</span>
                    </div>
                    <p className="text-[10px] text-nexus-muted mt-2">Percentual do DSR que será acrescido ao valor final da RV.</p>
                  </div>
                </StepSection>

                {/* STEP 2: Elegibilidade */}
                <StepSection
                  stepNumber={2}
                  title="Indicadores de Elegibilidade"
                  subtitle="Condições obrigatórias — todos os critérios devem ser atendidos (lógica AND)"
                  icon={<Shield size={15} className="text-amber-600" />}
                  expanded={expandedSection === 'elegibilidade'}
                  onToggle={() => toggleSection('elegibilidade')}
                  completed={isElegDone && expandedSection !== 'elegibilidade'}
                >
                  <div className="space-y-3">
                    {form.elegibilidade.length > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-700 font-medium">
                        <Shield size={12} />
                        Todos os critérios abaixo devem ser atendidos para o colaborador ser elegível
                      </div>
                    )}

                    {form.elegibilidade.map((e, idx) => {
                      const selectedInd = indicadores.find(i => i.id === Number(e.id_indicador));
                      const unitLabel = selectedInd ? ` (${selectedInd.unidade})` : '';
                      return (
                        <div key={idx} className="flex items-end gap-2 bg-nexus-bg rounded-xl p-3">
                          <div className="flex-1">
                            <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Indicador</label>
                            <select
                              value={e.id_indicador}
                              onChange={ev => updateElegibilidade(idx, 'id_indicador', ev.target.value)}
                              className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            >
                              <option value="">Selecione...</option>
                              {indicadores.map(ind => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome} ({ind.unidade})</option>)}
                            </select>
                          </div>
                          <div className="w-20">
                            <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Operador</label>
                            <select
                              value={e.operador}
                              onChange={ev => updateElegibilidade(idx, 'operador', ev.target.value)}
                              className="w-full px-1 py-2 border border-nexus-border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            >
                              <option value=">=">≥</option><option value="<=">≤</option>
                              <option value=">">{'>'}</option><option value="<">{'<'}</option>
                              <option value="==">＝</option><option value="!=">≠</option>
                            </select>
                          </div>
                          <div className="w-28">
                            <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Valor Mín.{unitLabel}</label>
                            <input
                              type="number"
                              value={e.valor_minimo}
                              onChange={ev => updateElegibilidade(idx, 'valor_minimo', ev.target.value)}
                              className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                          </div>
                          <button onClick={() => removeElegibilidade(idx)} className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}

                    <button onClick={addElegibilidade} className="text-xs text-nexus-purple font-semibold hover:underline flex items-center gap-1 mt-1">
                      <Plus size={13} /> Adicionar critério de elegibilidade
                    </button>
                  </div>
                </StepSection>

                {/* STEP 3: Remuneração */}
                <StepSection
                  stepNumber={3}
                  title="Indicadores de Remuneração"
                  subtitle="Defina faixas de pagamento para cada indicador — o RV final será a soma dos payouts"
                  icon={<Award size={15} className="text-purple-600" />}
                  expanded={expandedSection === 'remuneracao'}
                  onToggle={() => toggleSection('remuneracao')}
                  completed={isRemDone && expandedSection !== 'remuneracao'}
                >
                  <div className="space-y-3">
                    {form.remuneracao.map((rem, remIdx) => {
                      const ind = indicadores.find(i => i.id === rem.id_indicador);
                      const { minLabel, maxLabel } = getFaixaPlaceholder(indicadores, rem.id_indicador);

                      return (
                        <div key={remIdx} className={`rounded-xl border overflow-hidden transition-all ${rem.tem_regra_propria ? 'border-purple-300 bg-purple-50/30' : 'border-nexus-border bg-nexus-bg/50'}`}>
                          {/* Indicator header */}
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${rem.tem_regra_propria ? 'text-purple-700' : 'text-nexus-muted'}`}>{ind?.codigo}</span>
                              <span className="text-[11px] text-nexus-textSecondary">{ind?.nome}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{ind?.unidade}</span>
                            </div>
                            <button
                              onClick={() => toggleRegrasProprias(remIdx)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 ${
                                rem.tem_regra_propria
                                  ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm'
                                  : 'bg-white text-nexus-purple border border-purple-300 hover:bg-purple-50'
                              }`}
                            >
                              {rem.tem_regra_propria ? (
                                <><Check size={12} /> Regra criada</>
                              ) : (
                                <><Plus size={12} /> Criar Regra para o indicador</>
                              )}
                            </button>
                          </div>

                          {/* Faixas (when rule is enabled) */}
                          {rem.tem_regra_propria && (
                            <div className="px-4 pb-4 pt-1 border-t border-purple-200 space-y-2">
                              {(rem.faixas || []).length === 0 && (
                                <p className="text-[10px] text-nexus-muted italic py-2">Nenhuma faixa adicionada. Adicione pelo menos uma faixa de pagamento.</p>
                              )}
                              {(rem.faixas || []).map((f: any, fIdx: number) => (
                                <div key={fIdx} className="flex items-end gap-2 bg-white rounded-lg p-3 border border-purple-100">
                                  <div className="flex-1 grid grid-cols-4 gap-2">
                                    <div>
                                      <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">{minLabel}</label>
                                      <input
                                        type="number"
                                        value={f.faixa_min}
                                        onChange={e => updateFaixa(remIdx, fIdx, 'faixa_min', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">{maxLabel}</label>
                                      <input
                                        type="number"
                                        value={f.faixa_max || ''}
                                        onChange={e => updateFaixa(remIdx, fIdx, 'faixa_max', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                        placeholder="∞"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Payout</label>
                                      <input
                                        type="number"
                                        value={f.valor_payout}
                                        onChange={e => updateFaixa(remIdx, fIdx, 'valor_payout', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Tipo</label>
                                      <select
                                        value={f.tipo_payout}
                                        onChange={e => updateFaixa(remIdx, fIdx, 'tipo_payout', e.target.value)}
                                        className="w-full px-1 py-1.5 border border-nexus-border rounded-lg text-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                      >
                                        <option value="valor_fixo">R$ Fixo</option>
                                        <option value="percentual_salario">% Salário</option>
                                        <option value="percentual_indicador">% Indicador</option>
                                      </select>
                                    </div>
                                  </div>
                                  <button onClick={() => removeFaixa(remIdx, fIdx)} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                              <button onClick={() => addFaixa(remIdx)} className="text-[10px] text-nexus-purple font-semibold hover:underline flex items-center gap-1">
                                <Plus size={11} /> Adicionar faixa
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </StepSection>

                {/* STEP 4: Teto */}
                <StepSection
                  stepNumber={4}
                  title="Teto de RV (Cap)"
                  subtitle="Valor máximo que o colaborador pode atingir — se não definido, não há limite"
                  icon={<AlertCircle size={15} className="text-blue-600" />}
                  expanded={expandedSection === 'teto'}
                  onToggle={() => toggleSection('teto')}
                  completed={form.tem_teto && expandedSection !== 'teto'}
                >
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-nexus-bg transition-colors">
                      <input
                        type="checkbox"
                        checked={form.tem_teto}
                        onChange={e => setForm({ ...form, tem_teto: e.target.checked, teto_rv: e.target.checked ? form.teto_rv : null })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-xs text-nexus-text font-medium">Definir teto de RV</span>
                    </label>
                    {form.tem_teto && (
                      <div>
                        <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Valor Máximo R$</label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-nexus-muted font-medium">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={form.teto_rv || ''}
                            onChange={e => setForm({ ...form, teto_rv: parseFloat(e.target.value) || null })}
                            className="w-40 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </StepSection>

                {/* STEP 5: Deflatores */}
                <StepSection
                  stepNumber={5}
                  title="Deflatores"
                  subtitle="Indicadores que reduzem o valor final da RV — aplicados após o cálculo completo e teto"
                  icon={<TrendingDown size={15} className="text-rose-600" />}
                  expanded={expandedSection === 'deflatores'}
                  onToggle={() => toggleSection('deflatores')}
                  completed={form.deflatores.length > 0 && expandedSection !== 'deflatores'}
                >
                  <div className="space-y-3">
                    {form.deflatores.map((def, defIdx) => {
                      const defInd = indicadores.find(i => i.id === Number(def.id_indicador));
                      const defUnit = defInd?.unidade || '%';
                      return (
                        <div key={defIdx} className="rounded-xl border border-rose-200 overflow-hidden bg-rose-50/30">
                          <div className="px-4 py-2.5 flex items-center justify-between bg-white border-b border-rose-100">
                            <select
                              value={def.id_indicador}
                              onChange={e => updateDeflator(defIdx, 'id_indicador', e.target.value)}
                              className="flex-1 px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                            >
                              <option value="">Selecione indicador...</option>
                              {indicadores.map(ind => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome} ({ind.unidade})</option>)}
                            </select>
                            <button onClick={() => removeDeflator(defIdx)} className="ml-2 p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {def.id_indicador && (
                            <div className="p-3 space-y-2">
                              {(def.faixas || []).map((f: any, fIdx: number) => (
                                <div key={fIdx} className="flex items-end gap-2 bg-white rounded-lg p-2.5 border border-rose-100">
                                  <div className="flex-1">
                                    <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Mín ({defUnit})</label>
                                    <input
                                      type="number"
                                      value={f.faixa_min}
                                      onChange={e => updateDeflatorFaixa(defIdx, fIdx, 'faixa_min', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Máx ({defUnit})</label>
                                    <input
                                      type="number"
                                      value={f.faixa_max || ''}
                                      onChange={e => updateDeflatorFaixa(defIdx, fIdx, 'faixa_max', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white"
                                      placeholder="∞"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">% Redução</label>
                                    <input
                                      type="number"
                                      value={f.percentual_reducao}
                                      onChange={e => updateDeflatorFaixa(defIdx, fIdx, 'percentual_reducao', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white"
                                    />
                                  </div>
                                  <button onClick={() => removeDeflatorFaixa(defIdx, fIdx)} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                              <button onClick={() => addDeflatorFaixa(defIdx)} className="text-[10px] text-rose-600 font-semibold hover:underline flex items-center gap-1">
                                <Plus size={11} /> Adicionar faixa de redução
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={addDeflator} className="text-xs text-nexus-purple font-semibold hover:underline flex items-center gap-1">
                      <Plus size={13} /> Adicionar deflator
                    </button>
                  </div>
                </StepSection>

              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-nexus-border flex justify-end">
              <button
                onClick={save}
                disabled={saving || !form.nome}
                className="px-6 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar Regra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
