import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, X, Loader2, AlertCircle, ChevronDown, ChevronUp, Check,
  DollarSign, Award, Shield, TrendingDown, FileText
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';

/* ── MonthYearPicker ── */
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
    if (value) { setYear(value.split('-')[0] || ''); setMonth(value.split('-')[1] || ''); }
  }, [value]);

  const handleChange = (m: string, y: string) => {
    if (m && y) onChange(`${y}-${m}`);
    else if (!m && !y) onChange('');
  };

  return (
    <div>
      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">{label}</label>
      <div className="flex gap-2">
        <select value={month} onChange={e => { setMonth(e.target.value); handleChange(e.target.value, year); }} className="flex-1 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30 appearance-none cursor-pointer">
          <option value="">Mês</option>
          {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={year} onChange={e => { setYear(e.target.value); handleChange(month, e.target.value); }} className="w-24 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30 appearance-none cursor-pointer">
          <option value="">Ano</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function getFaixaLabels(indicadores: any[], idInd: number | string): { minLabel: string; maxLabel: string } {
  const ind = (indicadores || []).find((i: any) => i.id === Number(idInd));
  if (!ind) return { minLabel: 'Mín', maxLabel: 'Máx' };
  const u = ind.unidade || '';
  if (u === '%') return { minLabel: 'Mín %', maxLabel: 'Máx %' };
  if (u === 'R$') return { minLabel: 'Mín R$', maxLabel: 'Máx R$' };
  if (u === 'un') return { minLabel: 'Mín un', maxLabel: 'Máx un' };
  if (u === 's') return { minLabel: 'Mín seg', maxLabel: 'Máx seg' };
  return { minLabel: `Mín (${u})`, maxLabel: `Máx (${u})` };
}

/* ── StepSection ── */
function StepSection({ stepNumber, title, subtitle, icon, expanded, onToggle, completed, children }: {
  stepNumber: number; title: string; subtitle: string; icon: React.ReactNode;
  expanded: boolean; onToggle: () => void; completed?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <button onClick={onToggle} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border ${
        expanded ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-sm'
          : completed ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
          : 'bg-white border-nexus-border hover:border-purple-200 hover:bg-purple-50/20'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          expanded ? 'bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/25'
            : completed ? 'bg-emerald-500 text-white shadow-sm'
            : 'bg-nexus-bg border-2 border-nexus-border text-nexus-muted'
        }`}>
          {completed && !expanded ? <Check size={18} strokeWidth={3} /> : <span className="text-sm font-bold">{stepNumber}</span>}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            {icon}
            <p className={`text-sm font-semibold ${expanded ? 'text-nexus-purple' : completed ? 'text-emerald-700' : 'text-nexus-text'}`}>{title}</p>
          </div>
          <p className={`text-[10px] mt-0.5 ${expanded ? 'text-purple-500' : 'text-nexus-muted'}`}>{subtitle}</p>
        </div>
        <div className={expanded ? 'text-nexus-purple' : 'text-nexus-muted'}>{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
      </button>
      {expanded && (
        <div className="mt-2 ml-5 pl-9 border-l-2 border-purple-200 pb-2 animate-fadeIn">
          <div className="bg-white rounded-xl border border-nexus-border p-4">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */

export default function RVRegras() {
  const { data: planos, loading, error, refetch } = useApi<any[]>('/rv/planos');
  const { data: indicadores } = useApi<any[]>('/rv/indicadores');
  const { showSuccess, showError } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('identificacao');

  const activeIndicadores = (indicadores || []).filter((i: any) => i.ativo);

  const emptyForm = {
    nome: '', descricao: '', vigencia_inicio: '', vigencia_fim: '',
    valor_dsr: 0, teto_rv: null as number | null, tem_teto: false,
    elegibilidade: [] as any[], remuneracao: [] as any[], deflatores: [] as any[],
  };
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setForm({
      ...emptyForm,
      remuneracao: activeIndicadores.map((ind, idx) => ({
        id_indicador: ind.id, indicador_codigo: ind.codigo, indicador_nome: ind.nome,
        indicador_unidade: ind.unidade, tem_regra_propria: false, faixas: [], ordem: idx,
      })),
    });
    setModal('new');
    setExpandedSection('identificacao');
  };

  const openEdit = async (plano: any) => {
    try {
      const { data } = await api.get(`/rv/planos/${plano.id}`);
      const allRem = activeIndicadores.map((ind, idx) => {
        const existing = data.remuneracao.find((r: any) => r.id_indicador === ind.id);
        return existing ? { ...existing, indicador_unidade: ind.unidade } : {
          id_indicador: ind.id, indicador_codigo: ind.codigo, indicador_nome: ind.nome,
          indicador_unidade: ind.unidade, tem_regra_propria: false, faixas: [], ordem: idx,
        };
      });
      setForm({
        nome: data.nome, descricao: data.descricao || '',
        vigencia_inicio: data.vigencia_inicio || '', vigencia_fim: data.vigencia_fim || '',
        valor_dsr: data.valor_dsr || 0, teto_rv: data.teto_rv, tem_teto: !!data.teto_rv,
        elegibilidade: data.elegibilidade || [], remuneracao: allRem, deflatores: data.deflatores || [],
      });
      setModal(plano.id);
      setExpandedSection('identificacao');
    } catch (err: any) { showError(err.response?.data?.error || 'Erro ao carregar regra'); }
  };

  const save = async () => {
    if (!form.nome) { showError('Nome da regra é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome, descricao: form.descricao,
        vigencia_inicio: form.vigencia_inicio || null, vigencia_fim: form.vigencia_fim || null,
        valor_dsr: parseFloat(form.valor_dsr as any) || 0,
        teto_rv: form.tem_teto ? (parseFloat(form.teto_rv as any) || null) : null,
        elegibilidade: form.elegibilidade.map((e, idx) => ({
          id_indicador: parseInt(e.id_indicador), operador: e.operador,
          valor_minimo: parseFloat(e.valor_minimo), ordem: idx,
        })),
        remuneracao: form.remuneracao.filter(r => r.tem_regra_propria).map((r, idx) => ({
          id_indicador: parseInt(r.id_indicador), tem_regra_propria: 1, ordem: idx,
          faixas: (r.faixas || []).map((f: any, fIdx: number) => ({
            faixa_min: parseFloat(f.faixa_min), faixa_max: f.faixa_max ? parseFloat(f.faixa_max) : null,
            valor_payout: parseFloat(f.valor_payout), tipo_payout: f.tipo_payout, ordem: fIdx,
          })),
        })),
        deflatores: form.deflatores.map((d, idx) => ({
          id_indicador: parseInt(d.id_indicador), ordem: idx,
          faixas: (d.faixas || []).map((f: any, fIdx: number) => ({
            faixa_min: parseFloat(f.faixa_min), faixa_max: f.faixa_max ? parseFloat(f.faixa_max) : null,
            percentual_reducao: parseFloat(f.percentual_reducao), ordem: fIdx,
          })),
        })),
      };
      if (modal === 'new') { await api.post('/rv/planos', payload); showSuccess('Regra criada'); }
      else { await api.put(`/rv/planos/${modal}`, { ...payload, ativo: 1 }); showSuccess('Regra atualizada'); }
      setModal(null); refetch();
    } catch (err: any) { showError(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar esta regra?')) return;
    try { await api.delete(`/rv/planos/${id}`); showSuccess('Regra desativada'); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  // ── Form helpers ──
  const addElegibilidade = () => setForm({ ...form, elegibilidade: [...form.elegibilidade, { id_indicador: '', operador: '>=', valor_minimo: 0 }] });
  const removeElegibilidade = (i: number) => setForm({ ...form, elegibilidade: form.elegibilidade.filter((_, idx) => idx !== i) });
  const updateElegibilidade = (i: number, f: string, v: any) => { const u = [...form.elegibilidade]; (u[i] as any)[f] = v; setForm({ ...form, elegibilidade: u }); };

  const toggleRegrasProprias = (i: number) => { const u = [...form.remuneracao]; u[i].tem_regra_propria = !u[i].tem_regra_propria; if (!u[i].tem_regra_propria) u[i].faixas = []; setForm({ ...form, remuneracao: u }); };
  const addFaixa = (ri: number) => { const u = [...form.remuneracao]; if (!u[ri].faixas) u[ri].faixas = []; u[ri].faixas.push({ faixa_min: 0, faixa_max: null, valor_payout: 0, tipo_payout: 'valor_fixo' }); setForm({ ...form, remuneracao: u }); };
  const removeFaixa = (ri: number, fi: number) => { const u = [...form.remuneracao]; u[ri].faixas = u[ri].faixas.filter((_: any, i: number) => i !== fi); setForm({ ...form, remuneracao: u }); };
  const updateFaixa = (ri: number, fi: number, f: string, v: any) => { const u = [...form.remuneracao]; (u[ri].faixas[fi] as any)[f] = v; setForm({ ...form, remuneracao: u }); };

  const addDeflator = () => setForm({ ...form, deflatores: [...form.deflatores, { id_indicador: '', faixas: [] }] });
  const removeDeflator = (i: number) => setForm({ ...form, deflatores: form.deflatores.filter((_, idx) => idx !== i) });
  const updateDeflator = (i: number, f: string, v: any) => { const u = [...form.deflatores]; (u[i] as any)[f] = v; setForm({ ...form, deflatores: u }); };
  const addDeflatorFaixa = (di: number) => { const u = [...form.deflatores]; if (!u[di].faixas) u[di].faixas = []; u[di].faixas.push({ faixa_min: 0, faixa_max: null, percentual_reducao: 0 }); setForm({ ...form, deflatores: u }); };
  const removeDeflatorFaixa = (di: number, fi: number) => { const u = [...form.deflatores]; u[di].faixas = u[di].faixas.filter((_: any, i: number) => i !== fi); setForm({ ...form, deflatores: u }); };
  const updateDeflatorFaixa = (di: number, fi: number, f: string, v: any) => { const u = [...form.deflatores]; (u[di].faixas[fi] as any)[f] = v; setForm({ ...form, deflatores: u }); };

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const isIdentDone = !!form.nome;
  const isDsrDone = form.valor_dsr > 0;
  const isElegDone = form.elegibilidade.length > 0 && form.elegibilidade.every(e => e.id_indicador);
  const isRemDone = form.remuneracao.some(r => r.tem_regra_propria && r.faixas?.length > 0);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-nexus-text">Regras de Remuneração Variável</h1>
          <p className="text-xs text-nexus-muted mt-1">Configure a composição completa do RV: DSR, elegibilidade, remuneração, teto e deflatores</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold"><Plus size={14} /> Nova Regra</button>
      </div>

      <div className="space-y-3">
        {(planos || []).map(plano => (
          <div key={plano.id} className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-nexus-bg/50 transition-colors" onClick={() => setExpanded(expanded === plano.id ? null : plano.id)}>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${plano.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{plano.ativo ? 'Ativa' : 'Inativa'}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-nexus-text">{plano.nome}</p>
                    {plano.valor_dsr > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">DSR: {plano.valor_dsr}%</span>}
                    {plano.teto_rv && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Teto: R$ {plano.teto_rv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                  </div>
                  <p className="text-[11px] text-nexus-muted mt-0.5">{plano.descricao || 'Sem descrição'} · Vigência: {plano.vigencia_inicio || '—'} até {plano.vigencia_fim || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); openEdit(plano); }} className="p-1 text-nexus-muted hover:text-nexus-purple"><Edit2 size={14} /></button>
                <button onClick={e => { e.stopPropagation(); remove(plano.id); }} className="p-1 text-nexus-muted hover:text-nexus-danger"><Trash2 size={14} /></button>
                {expanded === plano.id ? <ChevronUp size={16} className="text-nexus-muted" /> : <ChevronDown size={16} className="text-nexus-muted" />}
              </div>
            </div>
            {expanded === plano.id && (
              <div className="px-4 pb-4 border-t border-nexus-border pt-3 space-y-2">
                <div className="text-xs text-nexus-text space-y-1">
                  <div className="flex items-center gap-2"><DollarSign size={14} className="text-emerald-600" /><span className="font-medium">DSR:</span><span>{plano.valor_dsr || 0}%</span></div>
                  {plano.teto_rv && <div className="flex items-center gap-2"><AlertCircle size={14} className="text-blue-600" /><span className="font-medium">Teto:</span><span>R$ {plano.teto_rv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
                  <p className="text-[10px] text-nexus-muted italic mt-2">Clique em Editar para ver/modificar elegibilidade, remuneração e deflatores</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {(!planos || planos.length === 0) && <div className="card p-8 text-center"><p className="text-sm text-nexus-muted">Nenhuma regra cadastrada. Crie a primeira para começar.</p></div>}
      </div>

      {/* ══════════ Modal ══════════ */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-modal animate-scaleIn my-8" onClick={e => e.stopPropagation()}>
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
              <div className="space-y-3">
                {/* STEP 0: Identificação */}
                <StepSection stepNumber={0} title="Identificação e Vigência" subtitle="Nome da regra, descrição e período de vigência" icon={<FileText size={15} className="text-indigo-600" />} expanded={expandedSection === 'identificacao'} onToggle={() => toggleSection('identificacao')} completed={isIdentDone && expandedSection !== 'identificacao'}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Nome da Regra *</label>
                      <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30" placeholder="Ex: Regra Comercial 2026" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Descrição</label>
                      <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30" placeholder="Descrição opcional" />
                    </div>
                    <MonthYearPicker label="Vigência Início" value={form.vigencia_inicio} onChange={v => setForm({ ...form, vigencia_inicio: v })} />
                    <MonthYearPicker label="Vigência Fim" value={form.vigencia_fim} onChange={v => setForm({ ...form, vigencia_fim: v })} />
                  </div>
                </StepSection>

                {/* STEP 1: DSR */}
                <StepSection stepNumber={1} title="Valor da DSR" subtitle="Percentual de DSR aplicado sobre o valor da RV" icon={<DollarSign size={15} className="text-emerald-600" />} expanded={expandedSection === 'dsr'} onToggle={() => toggleSection('dsr')} completed={isDsrDone && expandedSection !== 'dsr'}>
                  <div>
                    <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Valor %</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.01" min="0" max="100" value={form.valor_dsr} onChange={e => setForm({ ...form, valor_dsr: parseFloat(e.target.value) || 0 })} className="w-32 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder="0.00" />
                      <span className="text-sm text-nexus-muted font-medium">%</span>
                    </div>
                  </div>
                </StepSection>

                {/* STEP 2: Elegibilidade */}
                <StepSection stepNumber={2} title="Indicadores de Elegibilidade" subtitle="Todos os critérios devem ser atendidos (lógica AND)" icon={<Shield size={15} className="text-amber-600" />} expanded={expandedSection === 'elegibilidade'} onToggle={() => toggleSection('elegibilidade')} completed={isElegDone && expandedSection !== 'elegibilidade'}>
                  <div className="space-y-3">
                    {form.elegibilidade.map((e, idx) => {
                      const selInd = activeIndicadores.find(i => i.id === Number(e.id_indicador));
                      const uLabel = selInd ? ` (${selInd.unidade})` : '';
                      return (
                        <div key={idx} className="flex items-end gap-2 bg-nexus-bg rounded-xl p-3">
                          <div className="flex-1">
                            <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Indicador</label>
                            <select value={e.id_indicador} onChange={ev => updateElegibilidade(idx, 'id_indicador', ev.target.value)} className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                              <option value="">Selecione...</option>
                              {activeIndicadores.map(ind => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome} ({ind.unidade})</option>)}
                            </select>
                          </div>
                          <div className="w-20">
                            <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Operador</label>
                            <select value={e.operador} onChange={ev => updateElegibilidade(idx, 'operador', ev.target.value)} className="w-full px-1 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                              <option value=">=">≥</option><option value="<=">≤</option><option value=">">{'>'}</option><option value="<">{'<'}</option><option value="==">＝</option><option value="!=">≠</option>
                            </select>
                          </div>
                          <div className="w-28">
                            <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Valor Mín.{uLabel}</label>
                            <input type="number" value={e.valor_minimo} onChange={ev => updateElegibilidade(idx, 'valor_minimo', ev.target.value)} className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white" />
                          </div>
                          <button onClick={() => removeElegibilidade(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      );
                    })}
                    <button onClick={addElegibilidade} className="text-xs text-nexus-purple font-semibold hover:underline flex items-center gap-1"><Plus size={13} /> Adicionar critério</button>
                  </div>
                </StepSection>

                {/* STEP 3: Remuneração */}
                <StepSection stepNumber={3} title="Indicadores de Remuneração" subtitle="Faixas de pagamento por indicador — RV final = soma dos payouts" icon={<Award size={15} className="text-purple-600" />} expanded={expandedSection === 'remuneracao'} onToggle={() => toggleSection('remuneracao')} completed={isRemDone && expandedSection !== 'remuneracao'}>
                  <div className="space-y-3">
                    {form.remuneracao.map((rem, ri) => {
                      const ind = activeIndicadores.find(i => i.id === rem.id_indicador);
                      const { minLabel, maxLabel } = getFaixaLabels(indicadores, rem.id_indicador);
                      return (
                        <div key={ri} className={`rounded-xl border overflow-hidden ${rem.tem_regra_propria ? 'border-purple-300 bg-purple-50/30' : 'border-nexus-border bg-nexus-bg/50'}`}>
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${rem.tem_regra_propria ? 'text-purple-700' : 'text-nexus-muted'}`}>{ind?.codigo}</span>
                              <span className="text-[11px] text-nexus-textSecondary">{ind?.nome}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{ind?.unidade}</span>
                            </div>
                            <button onClick={() => toggleRegrasProprias(ri)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 ${
                              rem.tem_regra_propria ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm' : 'bg-white text-nexus-purple border border-purple-300 hover:bg-purple-50'
                            }`}>
                              {rem.tem_regra_propria ? <><Check size={12} /> Regra criada</> : <><Plus size={12} /> Criar Regra para o indicador</>}
                            </button>
                          </div>
                          {rem.tem_regra_propria && (
                            <div className="px-4 pb-4 pt-1 border-t border-purple-200 space-y-2">
                              {(rem.faixas || []).map((f: any, fi: number) => (
                                <div key={fi} className="flex items-end gap-2 bg-white rounded-lg p-3 border border-purple-100">
                                  <div className="flex-1 grid grid-cols-4 gap-2">
                                    <div><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">{minLabel}</label><input type="number" value={f.faixa_min} onChange={e => updateFaixa(ri, fi, 'faixa_min', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" /></div>
                                    <div><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">{maxLabel}</label><input type="number" value={f.faixa_max || ''} onChange={e => updateFaixa(ri, fi, 'faixa_max', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" placeholder="∞" /></div>
                                    <div><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Payout</label><input type="number" value={f.valor_payout} onChange={e => updateFaixa(ri, fi, 'valor_payout', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" /></div>
                                    <div><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Tipo</label>
                                      <select value={f.tipo_payout} onChange={e => updateFaixa(ri, fi, 'tipo_payout', e.target.value)} className="w-full px-1 py-1.5 border border-nexus-border rounded-lg text-[10px] bg-white">
                                        <option value="valor_fixo">R$ Fixo</option><option value="percentual_salario">% Salário</option><option value="percentual_indicador">% Indicador</option>
                                      </select>
                                    </div>
                                  </div>
                                  <button onClick={() => removeFaixa(ri, fi)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                                </div>
                              ))}
                              <button onClick={() => addFaixa(ri)} className="text-[10px] text-nexus-purple font-semibold hover:underline flex items-center gap-1"><Plus size={11} /> Adicionar faixa</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </StepSection>

                {/* STEP 4: Teto */}
                <StepSection stepNumber={4} title="Teto de RV (Cap)" subtitle="Valor máximo — se não definido, não há limite" icon={<AlertCircle size={15} className="text-blue-600" />} expanded={expandedSection === 'teto'} onToggle={() => toggleSection('teto')} completed={form.tem_teto && expandedSection !== 'teto'}>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-nexus-bg">
                      <input type="checkbox" checked={form.tem_teto} onChange={e => setForm({ ...form, tem_teto: e.target.checked, teto_rv: e.target.checked ? form.teto_rv : null })} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-xs text-nexus-text font-medium">Definir teto de RV</span>
                    </label>
                    {form.tem_teto && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-nexus-muted font-medium">R$</span>
                        <input type="number" step="0.01" value={form.teto_rv || ''} onChange={e => setForm({ ...form, teto_rv: parseFloat(e.target.value) || null })} className="w-40 px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm" placeholder="0.00" />
                      </div>
                    )}
                  </div>
                </StepSection>

                {/* STEP 5: Deflatores */}
                <StepSection stepNumber={5} title="Deflatores" subtitle="Indicadores que reduzem o RV final — aplicados após cálculo e teto" icon={<TrendingDown size={15} className="text-rose-600" />} expanded={expandedSection === 'deflatores'} onToggle={() => toggleSection('deflatores')} completed={form.deflatores.length > 0 && expandedSection !== 'deflatores'}>
                  <div className="space-y-3">
                    {form.deflatores.map((def, di) => {
                      const defInd = activeIndicadores.find(i => i.id === Number(def.id_indicador));
                      const defUnit = defInd?.unidade || '%';
                      return (
                        <div key={di} className="rounded-xl border border-rose-200 overflow-hidden bg-rose-50/30">
                          <div className="px-4 py-2.5 flex items-center justify-between bg-white border-b border-rose-100">
                            <select value={def.id_indicador} onChange={e => updateDeflator(di, 'id_indicador', e.target.value)} className="flex-1 px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                              <option value="">Selecione indicador...</option>
                              {activeIndicadores.map(ind => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome} ({ind.unidade})</option>)}
                            </select>
                            <button onClick={() => removeDeflator(di)} className="ml-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                          {def.id_indicador && (
                            <div className="p-3 space-y-2">
                              {(def.faixas || []).map((f: any, fi: number) => (
                                <div key={fi} className="flex items-end gap-2 bg-white rounded-lg p-2.5 border border-rose-100">
                                  <div className="flex-1"><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Mín ({defUnit})</label><input type="number" value={f.faixa_min} onChange={e => updateDeflatorFaixa(di, fi, 'faixa_min', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" /></div>
                                  <div className="flex-1"><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Máx ({defUnit})</label><input type="number" value={f.faixa_max || ''} onChange={e => updateDeflatorFaixa(di, fi, 'faixa_max', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" placeholder="∞" /></div>
                                  <div className="flex-1"><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">% Redução</label><input type="number" value={f.percentual_reducao} onChange={e => updateDeflatorFaixa(di, fi, 'percentual_reducao', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" /></div>
                                  <button onClick={() => removeDeflatorFaixa(di, fi)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                                </div>
                              ))}
                              <button onClick={() => addDeflatorFaixa(di)} className="text-[10px] text-rose-600 font-semibold hover:underline flex items-center gap-1"><Plus size={11} /> Adicionar faixa</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={addDeflator} className="text-xs text-nexus-purple font-semibold hover:underline flex items-center gap-1"><Plus size={13} /> Adicionar deflator</button>
                  </div>
                </StepSection>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-nexus-border flex justify-end">
              <button onClick={save} disabled={saving || !form.nome} className="px-6 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Salvando...' : 'Salvar Regra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
