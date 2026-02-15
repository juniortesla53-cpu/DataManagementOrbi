import { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft, Plus, Edit2, Trash2, X, Loader2,
  AlertCircle, Award, TrendingDown, Shield, ChevronDown, ChevronUp, Check,
  Users, FileText, Link2, Percent, Building2
} from 'lucide-react';
import api from '../../../api';

interface Props {
  clienteIds: number[];
  regrasSelecionadas: number[];
  setRegrasSelecionadas: (r: number[]) => void;
  onNext: () => void;
  onBack: () => void;
}

/* ══════ Constants ══════ */
const TIPOS_CARGO = [
  { value: 'operador', label: 'RV Operador', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'supervisor', label: 'RV Supervisor', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'supervisor_ii', label: 'RV Supervisor II', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'coordenador', label: 'RV Coordenador', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'gerente', label: 'RV Gerente', color: 'bg-amber-100 text-amber-700 border-amber-300' },
];

const TIPOS_CALCULO = [
  { value: 'faixas', label: 'Faixas e Condicionais', desc: 'Cálculo por faixas de atingimento com regras condicionais', icon: Award },
  { value: 'percentual_rv', label: '% de outra RV', desc: 'Percentual do valor total de outra RV do grupo', icon: Percent },
  { value: 'valor_rv', label: 'Valor de outra RV', desc: 'Usa o valor integral de outra RV do grupo', icon: Link2 },
  { value: 'percentual_faturamento', label: '% do Faturamento', desc: 'Percentual sobre valor de faturamento', icon: TrendingDown },
];

const CAMPOS_CONDICIONAIS = [
  { value: 'operacao', label: 'Operação' },
  { value: 'segmento', label: 'Segmento' },
  { value: 'cargo', label: 'Cargo' },
  { value: 'site', label: 'Site' },
];

const MESES = [
  { value: '01', label: 'Janeiro' },  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },    { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },     { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },    { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

/* ══════ Small Components ══════ */

function MonthYearPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);
  const [month, setMonth] = useState(value ? value.split('-')[1] : '');
  const [year, setYear] = useState(value ? value.split('-')[0] : '');
  useEffect(() => { if (value) { setYear(value.split('-')[0] || ''); setMonth(value.split('-')[1] || ''); } }, [value]);
  const handleChange = (m: string, y: string) => { if (m && y) onChange(`${y}-${m}`); else if (!m && !y) onChange(''); };
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
          <div className="flex items-center gap-2">{icon}<p className={`text-sm font-semibold ${expanded ? 'text-nexus-purple' : completed ? 'text-emerald-700' : 'text-nexus-text'}`}>{title}</p></div>
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

/* ══════ Cargo Editor ══════ */
function CargoPlanoEditor({ plano, onChange, allPlanos, indicadores }: {
  plano: any; onChange: (p: any) => void; allPlanos: any[]; indicadores: any[];
}) {
  const [openSection, setOpenSection] = useState<string | null>(plano.tipo_calculo === 'faixas' ? 'elegibilidade' : null);
  const activeInd = indicadores.filter((i: any) => i.ativo);
  const outrosPlanos = allPlanos.filter(p => p.tipo_cargo !== plano.tipo_cargo);

  const addEleg = () => onChange({ ...plano, elegibilidade: [...(plano.elegibilidade || []), { tipo_comparacao: 'indicador', id_indicador: '', operador: '>=', valor_minimo: 0, campo: '', valor_texto: '' }] });
  const removeEleg = (i: number) => onChange({ ...plano, elegibilidade: (plano.elegibilidade || []).filter((_: any, idx: number) => idx !== i) });
  const updateEleg = (i: number, f: string, v: any) => { const u = [...(plano.elegibilidade || [])]; (u[i] as any)[f] = v; onChange({ ...plano, elegibilidade: u }); };

  const toggleRegra = (i: number) => { const u = [...(plano.remuneracao || [])]; u[i].tem_regra_propria = !u[i].tem_regra_propria; if (!u[i].tem_regra_propria) { u[i].faixas = []; u[i].condicoes = []; } onChange({ ...plano, remuneracao: u }); };
  const addFaixa = (ri: number) => { const u = [...(plano.remuneracao || [])]; if (!u[ri].faixas) u[ri].faixas = []; u[ri].faixas.push({ faixa_min: 0, faixa_max: null, valor_payout: 0, tipo_payout: 'valor_fixo' }); onChange({ ...plano, remuneracao: u }); };
  const removeFaixa = (ri: number, fi: number) => { const u = [...(plano.remuneracao || [])]; u[ri].faixas = u[ri].faixas.filter((_: any, i: number) => i !== fi); onChange({ ...plano, remuneracao: u }); };
  const updateFaixa = (ri: number, fi: number, f: string, v: any) => { const u = [...(plano.remuneracao || [])]; (u[ri].faixas[fi] as any)[f] = v; onChange({ ...plano, remuneracao: u }); };
  const addCond = (ri: number) => { const u = [...(plano.remuneracao || [])]; if (!u[ri].condicoes) u[ri].condicoes = []; u[ri].condicoes.push({ campo: 'operacao', operador: '=', valor: '', tipo: 'texto' }); onChange({ ...plano, remuneracao: u }); };
  const removeCond = (ri: number, ci: number) => { const u = [...(plano.remuneracao || [])]; u[ri].condicoes = u[ri].condicoes.filter((_: any, i: number) => i !== ci); onChange({ ...plano, remuneracao: u }); };
  const updateCond = (ri: number, ci: number, f: string, v: any) => { const u = [...(plano.remuneracao || [])]; (u[ri].condicoes[ci] as any)[f] = v; onChange({ ...plano, remuneracao: u }); };

  const addDeflator = () => onChange({ ...plano, deflatores: [...(plano.deflatores || []), { id_indicador: '', faixas: [] }] });
  const removeDeflator = (i: number) => onChange({ ...plano, deflatores: (plano.deflatores || []).filter((_: any, idx: number) => idx !== i) });
  const updateDeflator = (i: number, f: string, v: any) => { const u = [...(plano.deflatores || [])]; (u[i] as any)[f] = v; onChange({ ...plano, deflatores: u }); };
  const addDefFaixa = (di: number) => { const u = [...(plano.deflatores || [])]; if (!u[di].faixas) u[di].faixas = []; u[di].faixas.push({ faixa_min: 0, faixa_max: null, percentual_reducao: 0 }); onChange({ ...plano, deflatores: u }); };
  const removeDefFaixa = (di: number, fi: number) => { const u = [...(plano.deflatores || [])]; u[di].faixas = u[di].faixas.filter((_: any, i: number) => i !== fi); onChange({ ...plano, deflatores: u }); };
  const updateDefFaixa = (di: number, fi: number, f: string, v: any) => { const u = [...(plano.deflatores || [])]; (u[di].faixas[fi] as any)[f] = v; onChange({ ...plano, deflatores: u }); };

  const toggleSec = (s: string) => setOpenSection(openSection === s ? null : s);

  return (
    <div className="space-y-4">
      {/* Tipo de Cálculo */}
      <div>
        <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">Tipo de Cálculo</label>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_CALCULO.map(tc => {
            const Icon = tc.icon;
            const sel = plano.tipo_calculo === tc.value;
            return (
              <button key={tc.value} type="button" onClick={() => onChange({ ...plano, tipo_calculo: tc.value })}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${sel ? 'border-purple-400 bg-purple-50 shadow-sm' : 'border-nexus-border hover:border-purple-200'}`}>
                <Icon size={18} className={sel ? 'text-purple-600 mt-0.5' : 'text-nexus-muted mt-0.5'} />
                <div>
                  <p className={`text-xs font-semibold ${sel ? 'text-purple-700' : 'text-nexus-text'}`}>{tc.label}</p>
                  <p className="text-[9px] text-nexus-muted mt-0.5">{tc.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reference-based */}
      {(plano.tipo_calculo === 'percentual_rv' || plano.tipo_calculo === 'valor_rv') && (
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 space-y-3">
          <p className="text-xs font-semibold text-indigo-700">🔗 Referência a outra RV do grupo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">RV de Referência</label>
              <select value={plano.id_plano_referencia_cargo || ''} onChange={e => onChange({ ...plano, id_plano_referencia_cargo: e.target.value })} className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-xs bg-white">
                <option value="">Selecione...</option>
                {outrosPlanos.map(op => <option key={op.tipo_cargo} value={op.tipo_cargo}>{TIPOS_CARGO.find(t => t.value === op.tipo_cargo)?.label || op.tipo_cargo}</option>)}
              </select>
            </div>
            {plano.tipo_calculo === 'percentual_rv' && (
              <div>
                <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Percentual (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" step="0.1" value={plano.percentual_referencia || ''} onChange={e => onChange({ ...plano, percentual_referencia: parseFloat(e.target.value) || 0 })} className="w-24 px-3 py-2 border border-indigo-200 rounded-lg text-xs bg-white" placeholder="50" />
                  <span className="text-xs text-nexus-muted">%</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-[9px] text-indigo-500 italic">{plano.tipo_calculo === 'percentual_rv' ? 'O sistema calculará primeiro a RV referenciada, depois aplicará o percentual.' : 'Usa o valor integral da RV referenciada.'}</p>
        </div>
      )}

      {plano.tipo_calculo === 'percentual_faturamento' && (
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-200 space-y-3">
          <p className="text-xs font-semibold text-teal-700">📊 Percentual sobre Faturamento</p>
          <div className="flex items-center gap-2">
            <input type="number" min="0" step="0.01" value={plano.percentual_referencia || ''} onChange={e => onChange({ ...plano, percentual_referencia: parseFloat(e.target.value) || 0 })} className="w-28 px-3 py-2.5 border border-teal-200 rounded-lg text-sm bg-white" placeholder="0.5" />
            <span className="text-sm text-nexus-muted">% do faturamento</span>
          </div>
        </div>
      )}

      {/* Faixas-based */}
      {plano.tipo_calculo === 'faixas' && (
        <div className="space-y-3">
          {/* Teto */}
          <div className="flex items-center gap-3 p-3 bg-nexus-bg rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!plano.teto_rv} onChange={e => onChange({ ...plano, teto_rv: e.target.checked ? plano.teto_rv || '' : null })} className="w-4 h-4 rounded" />
              <span className="text-xs font-medium text-nexus-text">Definir Teto de RV</span>
            </label>
            {plano.teto_rv !== null && plano.teto_rv !== undefined && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-nexus-muted">R$</span>
                <input type="number" step="0.01" value={plano.teto_rv || ''} onChange={e => onChange({ ...plano, teto_rv: parseFloat(e.target.value) || null })} className="w-32 px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" placeholder="0.00" />
              </div>
            )}
          </div>

          {/* Elegibilidade */}
          <StepSection stepNumber={1} title="Elegibilidade" subtitle="Critérios AND — numéricos ou textuais" icon={<Shield size={15} className="text-amber-600" />} expanded={openSection === 'elegibilidade'} onToggle={() => toggleSec('elegibilidade')} completed={(plano.elegibilidade || []).length > 0 && openSection !== 'elegibilidade'}>
            <div className="space-y-3">
              {(plano.elegibilidade || []).map((e: any, idx: number) => (
                <div key={idx} className="bg-nexus-bg rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <select value={e.tipo_comparacao || 'indicador'} onChange={ev => updateEleg(idx, 'tipo_comparacao', ev.target.value)} className="px-2 py-1.5 border border-nexus-border rounded-lg text-[10px] bg-white font-semibold">
                      <option value="indicador">Por Indicador (numérico)</option>
                      <option value="campo">Por Campo (texto)</option>
                    </select>
                    <button onClick={() => removeEleg(idx)} className="ml-auto p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                  {(e.tipo_comparacao || 'indicador') === 'indicador' ? (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Indicador</label>
                        <select value={e.id_indicador || ''} onChange={ev => updateEleg(idx, 'id_indicador', ev.target.value)} className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                          <option value="">Selecione...</option>
                          {activeInd.map((ind: any) => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome} ({ind.unidade})</option>)}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Op</label>
                        <select value={e.operador} onChange={ev => updateEleg(idx, 'operador', ev.target.value)} className="w-full px-1 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                          <option value=">=">≥</option><option value="<=">≤</option><option value=">">{'>'}</option><option value="<">{'<'}</option><option value="==">＝</option><option value="!=">≠</option>
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Valor</label>
                        <input type="number" value={e.valor_minimo} onChange={ev => updateEleg(idx, 'valor_minimo', ev.target.value)} className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Campo</label>
                        <select value={e.campo || ''} onChange={ev => updateEleg(idx, 'campo', ev.target.value)} className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                          <option value="">Selecione...</option>
                          {CAMPOS_CONDICIONAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Op</label>
                        <select value={e.operador} onChange={ev => updateEleg(idx, 'operador', ev.target.value)} className="w-full px-1 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                          <option value="=">=</option><option value="!=">≠</option><option value="LIKE">contém</option><option value="IN">em lista</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Valor</label>
                        <input type="text" value={e.valor_texto || ''} onChange={ev => updateEleg(idx, 'valor_texto', ev.target.value)} className="w-full px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white" placeholder="ex: VIVO NEXT" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addEleg} className="text-xs text-nexus-purple font-semibold hover:underline flex items-center gap-1"><Plus size={13} /> Adicionar critério</button>
            </div>
          </StepSection>

          {/* Remuneração */}
          <StepSection stepNumber={2} title="Remuneração" subtitle="Faixas de pagamento com condições textuais opcionais" icon={<Award size={15} className="text-purple-600" />} expanded={openSection === 'remuneracao'} onToggle={() => toggleSec('remuneracao')} completed={(plano.remuneracao || []).some((r: any) => r.tem_regra_propria) && openSection !== 'remuneracao'}>
            <div className="space-y-3">
              {(plano.remuneracao || []).map((rem: any, ri: number) => {
                const ind = activeInd.find((i: any) => i.id === rem.id_indicador);
                const { minLabel, maxLabel } = getFaixaLabels(indicadores, rem.id_indicador);
                return (
                  <div key={ri} className={`rounded-xl border overflow-hidden ${rem.tem_regra_propria ? 'border-purple-300 bg-purple-50/30' : 'border-nexus-border bg-nexus-bg/50'}`}>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${rem.tem_regra_propria ? 'text-purple-700' : 'text-nexus-muted'}`}>{ind?.codigo}</span>
                        <span className="text-[11px] text-nexus-textSecondary">{ind?.nome}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{ind?.unidade}</span>
                      </div>
                      <button onClick={() => toggleRegra(ri)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 ${
                        rem.tem_regra_propria ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm' : 'bg-white text-nexus-purple border border-purple-300 hover:bg-purple-50'
                      }`}>
                        {rem.tem_regra_propria ? <><Check size={12} /> Regra criada</> : <><Plus size={12} /> Criar Regra para o indicador</>}
                      </button>
                    </div>
                    {rem.tem_regra_propria && (
                      <div className="px-4 pb-4 pt-1 border-t border-purple-200 space-y-3">
                        {/* Condições textuais */}
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                          <p className="text-[9px] font-semibold text-amber-700 mb-2 uppercase">Condições (opcional)</p>
                          {(rem.condicoes || []).map((c: any, ci: number) => (
                            <div key={ci} className="flex items-end gap-2 mb-2">
                              <div className="flex-1">
                                <select value={c.campo} onChange={e => updateCond(ri, ci, 'campo', e.target.value)} className="w-full px-2 py-1.5 border border-amber-200 rounded-lg text-[10px] bg-white">
                                  {CAMPOS_CONDICIONAIS.map(cc => <option key={cc.value} value={cc.value}>{cc.label}</option>)}
                                </select>
                              </div>
                              <div className="w-16">
                                <select value={c.operador} onChange={e => updateCond(ri, ci, 'operador', e.target.value)} className="w-full px-1 py-1.5 border border-amber-200 rounded-lg text-[10px] bg-white">
                                  <option value="=">=</option><option value="!=">≠</option><option value="LIKE">contém</option>
                                </select>
                              </div>
                              <div className="flex-1">
                                <input type="text" value={c.valor} onChange={e => updateCond(ri, ci, 'valor', e.target.value)} className="w-full px-2 py-1.5 border border-amber-200 rounded-lg text-[10px] bg-white" placeholder="ex: VIVO NEXT" />
                              </div>
                              <button onClick={() => removeCond(ri, ci)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                            </div>
                          ))}
                          <button onClick={() => addCond(ri)} className="text-[9px] text-amber-700 font-semibold hover:underline flex items-center gap-1"><Plus size={10} /> Adicionar condição</button>
                        </div>
                        {/* Faixas */}
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

          {/* Deflatores */}
          <StepSection stepNumber={3} title="Deflatores" subtitle="Redução do RV — aplicados após cálculo e teto" icon={<TrendingDown size={15} className="text-rose-600" />} expanded={openSection === 'deflatores'} onToggle={() => toggleSec('deflatores')} completed={(plano.deflatores || []).length > 0 && openSection !== 'deflatores'}>
            <div className="space-y-3">
              {(plano.deflatores || []).map((def: any, di: number) => {
                const defInd = activeInd.find((i: any) => i.id === Number(def.id_indicador));
                const defUnit = defInd?.unidade || '%';
                return (
                  <div key={di} className="rounded-xl border border-rose-200 overflow-hidden bg-rose-50/30">
                    <div className="px-4 py-2.5 flex items-center justify-between bg-white border-b border-rose-100">
                      <select value={def.id_indicador} onChange={e => updateDeflator(di, 'id_indicador', e.target.value)} className="flex-1 px-2 py-2 border border-nexus-border rounded-lg text-xs bg-white">
                        <option value="">Selecione indicador...</option>
                        {activeInd.map((ind: any) => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome} ({ind.unidade})</option>)}
                      </select>
                      <button onClick={() => removeDeflator(di)} className="ml-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                    {def.id_indicador && (
                      <div className="p-3 space-y-2">
                        {(def.faixas || []).map((f: any, fi: number) => (
                          <div key={fi} className="flex items-end gap-2 bg-white rounded-lg p-2.5 border border-rose-100">
                            <div className="flex-1"><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Mín ({defUnit})</label><input type="number" value={f.faixa_min} onChange={e => updateDefFaixa(di, fi, 'faixa_min', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" /></div>
                            <div className="flex-1"><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">Máx ({defUnit})</label><input type="number" value={f.faixa_max || ''} onChange={e => updateDefFaixa(di, fi, 'faixa_max', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" placeholder="∞" /></div>
                            <div className="flex-1"><label className="block text-[9px] text-nexus-muted mb-1 font-semibold">% Redução</label><input type="number" value={f.percentual_reducao} onChange={e => updateDefFaixa(di, fi, 'percentual_reducao', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded-lg text-xs bg-white" /></div>
                            <button onClick={() => removeDefFaixa(di, fi)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                          </div>
                        ))}
                        <button onClick={() => addDefFaixa(di)} className="text-[10px] text-rose-600 font-semibold hover:underline flex items-center gap-1"><Plus size={11} /> Adicionar faixa</button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={addDeflator} className="text-xs text-nexus-purple font-semibold hover:underline flex items-center gap-1"><Plus size={13} /> Adicionar deflator</button>
            </div>
          </StepSection>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*                    STEP REGRAS (Wizard)                   */
/* ══════════════════════════════════════════════════════════ */

export default function StepRegras({ clienteIds, regrasSelecionadas, setRegrasSelecionadas, onNext, onBack }: Props) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('identificacao');
  const [activeCargoTab, setActiveCargoTab] = useState<string>('');
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null);

  const activeIndicadores = indicadores.filter((i: any) => i.ativo);

  const emptyForm = {
    nome: '', descricao: '',
    vigencia_inicio: '', vigencia_fim: '',
    planos: [] as any[],
    cargosSelecionados: [] as string[],
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, iRes] = await Promise.all([api.get('/rv/grupos'), api.get('/rv/indicadores')]);
      const filtered = (gRes.data || []).filter((g: any) =>
        clienteIds.length === 0 || clienteIds.includes(g.id_cliente)
      );
      setGrupos(filtered);
      setIndicadores(iRes.data || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [clienteIds.join(',')]);

  const buildPlanoForCargo = (tipo_cargo: string) => ({
    tipo_cargo, tipo_calculo: 'faixas', teto_rv: null,
    percentual_referencia: null, id_plano_referencia_cargo: '',
    elegibilidade: [],
    remuneracao: activeIndicadores.map((ind, idx) => ({
      id_indicador: ind.id, indicador_codigo: ind.codigo, indicador_nome: ind.nome,
      indicador_unidade: ind.unidade, tem_regra_propria: false, faixas: [], condicoes: [], ordem: idx,
    })),
    deflatores: [],
  });

  const openNew = () => {
    setForm({ ...emptyForm, planos: [], cargosSelecionados: [] });
    setModal('new');
    setExpandedSection('identificacao');
    setActiveCargoTab('');
  };

  const openEdit = async (grupo: any) => {
    try {
      const { data } = await api.get(`/rv/grupos/${grupo.id}`);
      const cargos = (data.planos || []).map((p: any) => p.tipo_cargo);
      const planos = (data.planos || []).map((p: any) => {
        const allRem = activeIndicadores.map((ind, idx) => {
          const existing = (p.remuneracao || []).find((r: any) => r.id_indicador === ind.id);
          return existing ? { ...existing, indicador_unidade: ind.unidade } : {
            id_indicador: ind.id, indicador_codigo: ind.codigo, indicador_nome: ind.nome,
            indicador_unidade: ind.unidade, tem_regra_propria: false, faixas: [], condicoes: [], ordem: idx,
          };
        });
        return { ...p, remuneracao: allRem };
      });
      setForm({
        nome: data.nome, descricao: data.descricao || '',
        vigencia_inicio: data.vigencia_inicio || '', vigencia_fim: data.vigencia_fim || '',
        planos, cargosSelecionados: cargos,
      });
      setModal(grupo.id);
      setExpandedSection('identificacao');
      setActiveCargoTab(cargos[0] || '');
    } catch { }
  };

  const toggleCargo = (cargo: string) => {
    const has = form.cargosSelecionados.includes(cargo);
    if (has) {
      setForm({ ...form, cargosSelecionados: form.cargosSelecionados.filter(c => c !== cargo), planos: form.planos.filter(p => p.tipo_cargo !== cargo) });
      if (activeCargoTab === cargo) setActiveCargoTab(form.cargosSelecionados.filter(c => c !== cargo)[0] || '');
    } else {
      setForm({ ...form, cargosSelecionados: [...form.cargosSelecionados, cargo], planos: [...form.planos, buildPlanoForCargo(cargo)] });
      setActiveCargoTab(cargo);
    }
  };

  const updatePlano = (cargo: string, updated: any) => {
    setForm({ ...form, planos: form.planos.map(p => p.tipo_cargo === cargo ? { ...p, ...updated } : p) });
  };

  const save = async () => {
    if (!form.nome) return;
    if (form.cargosSelecionados.length === 0) return;
    setSaving(true);
    try {
      const id_cliente = clienteIds[0] || null;
      const payload = {
        id_cliente, nome: form.nome, descricao: form.descricao,
        vigencia_inicio: form.vigencia_inicio || null, vigencia_fim: form.vigencia_fim || null,
        planos: form.planos.map(p => ({
          nome: `${form.nome} — ${TIPOS_CARGO.find(t => t.value === p.tipo_cargo)?.label || p.tipo_cargo}`,
          tipo_cargo: p.tipo_cargo, tipo_calculo: p.tipo_calculo,
          percentual_referencia: p.percentual_referencia,
          id_plano_referencia: null, valor_dsr: 0,
          teto_rv: p.tipo_calculo === 'faixas' ? (p.teto_rv || null) : null,
          elegibilidade: (p.elegibilidade || []).map((e: any, idx: number) => ({
            id_indicador: e.tipo_comparacao === 'indicador' ? parseInt(e.id_indicador) : null,
            operador: e.operador, valor_minimo: parseFloat(e.valor_minimo) || 0,
            campo: e.campo || null, valor_texto: e.valor_texto || null,
            tipo_comparacao: e.tipo_comparacao || 'indicador', ordem: idx,
          })),
          remuneracao: p.tipo_calculo === 'faixas' ? (p.remuneracao || []).filter((r: any) => r.tem_regra_propria).map((r: any, idx: number) => ({
            id_indicador: parseInt(r.id_indicador), tem_regra_propria: 1, ordem: idx,
            faixas: (r.faixas || []).map((f: any, fIdx: number) => ({
              faixa_min: parseFloat(f.faixa_min), faixa_max: f.faixa_max ? parseFloat(f.faixa_max) : null,
              valor_payout: parseFloat(f.valor_payout), tipo_payout: f.tipo_payout, ordem: fIdx,
            })),
            condicoes: (r.condicoes || []).map((c: any, cIdx: number) => ({
              campo: c.campo, operador: c.operador || '=', valor: c.valor, tipo: c.tipo || 'texto', ordem: cIdx,
            })),
          })) : [],
          deflatores: p.tipo_calculo === 'faixas' ? (p.deflatores || []).map((d: any, idx: number) => ({
            id_indicador: parseInt(d.id_indicador), ordem: idx,
            faixas: (d.faixas || []).map((f: any, fIdx: number) => ({
              faixa_min: parseFloat(f.faixa_min), faixa_max: f.faixa_max ? parseFloat(f.faixa_max) : null,
              percentual_reducao: parseFloat(f.percentual_reducao), ordem: fIdx,
            })),
          })) : [],
        })),
      };
      if (modal === 'new') {
        const res = await api.post('/rv/grupos', payload);
        setRegrasSelecionadas([...regrasSelecionadas, res.data.id]);
      } else {
        await api.put(`/rv/grupos/${modal}`, { ...payload, ativo: 1 });
      }
      setModal(null);
      fetchData();
    } catch { }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar esta regra e todas as sub-RVs?')) return;
    try {
      await api.delete(`/rv/grupos/${id}`);
      setRegrasSelecionadas(regrasSelecionadas.filter(r => r !== id));
      fetchData();
    } catch { }
  };

  const toggleGrupoSelection = (id: number) => {
    setRegrasSelecionadas(
      regrasSelecionadas.includes(id)
        ? regrasSelecionadas.filter(r => r !== id)
        : [...regrasSelecionadas, id]
    );
  };

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const isIdentDone = !!form.nome;
  const isCargosDone = form.cargosSelecionados.length > 0;

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-nexus-text">Regras de RV</h2>
          <p className="text-xs text-nexus-muted mt-1">Selecione as regras para o cálculo ou crie novas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold">
          <Plus size={14} /> Nova Regra
        </button>
      </div>

      {/* Grupos list with selection */}
      <div className="space-y-3">
        {grupos.filter(g => g.ativo).map(grupo => {
          const selected = regrasSelecionadas.includes(grupo.id);
          return (
            <div key={grupo.id} className={`card overflow-hidden transition-all ${selected ? 'ring-2 ring-nexus-purple shadow-md' : ''}`}>
              <div className="flex items-center gap-3 p-4">
                {/* Selection checkbox */}
                <button onClick={() => toggleGrupoSelection(grupo.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-nexus-purple border-nexus-purple text-white' : 'border-nexus-border hover:border-nexus-purple'}`}>
                  {selected && <Check size={14} strokeWidth={3} />}
                </button>

                <div className="flex-1 cursor-pointer" onClick={() => setExpandedGrupo(expandedGrupo === grupo.id ? null : grupo.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-nexus-text">{grupo.nome}</p>
                    {grupo.cliente_nome && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium flex items-center gap-1"><Building2 size={10} /> {grupo.cliente_nome}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {(grupo.planos || []).map((p: any) => {
                      const tc = TIPOS_CARGO.find(t => t.value === p.tipo_cargo);
                      return <span key={p.id} className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${tc?.color || 'bg-gray-100 text-gray-600 border-gray-300'}`}>{tc?.label || p.tipo_cargo}</span>;
                    })}
                    <span className="text-[10px] text-nexus-muted ml-1">Vigência: {grupo.vigencia_inicio || '—'} até {grupo.vigencia_fim || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(grupo)} className="p-1.5 text-nexus-muted hover:text-nexus-purple rounded-lg hover:bg-nexus-bg"><Edit2 size={14} /></button>
                  <button onClick={() => remove(grupo.id)} className="p-1.5 text-nexus-muted hover:text-nexus-danger rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  <div className="text-nexus-muted ml-1 cursor-pointer" onClick={() => setExpandedGrupo(expandedGrupo === grupo.id ? null : grupo.id)}>
                    {expandedGrupo === grupo.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {expandedGrupo === grupo.id && (
                <div className="px-4 pb-4 border-t border-nexus-border pt-3 space-y-2">
                  {(grupo.planos || []).map((p: any) => {
                    const tc = TIPOS_CARGO.find(t => t.value === p.tipo_cargo);
                    const tcCalc = TIPOS_CALCULO.find(t => t.value === p.tipo_calculo);
                    return (
                      <div key={p.id} className="flex items-center gap-3 text-xs p-2 bg-nexus-bg rounded-lg">
                        <span className={`px-2 py-0.5 rounded-full border font-semibold text-[10px] ${tc?.color || ''}`}>{tc?.label}</span>
                        <span className="text-nexus-muted">→</span>
                        <span className="text-nexus-text font-medium">{tcCalc?.label}</span>
                        {p.percentual_referencia && <span className="text-nexus-muted">({p.percentual_referencia}%)</span>}
                        {p.teto_rv && <span className="text-blue-600 text-[10px]">Teto: R$ {Number(p.teto_rv).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {grupos.filter(g => g.ativo).length === 0 && (
          <div className="card p-8 text-center">
            <Users size={40} className="mx-auto mb-3 text-nexus-muted opacity-30" />
            <p className="text-sm text-nexus-muted">Nenhuma regra encontrada para o(s) cliente(s) selecionado(s).</p>
            <button onClick={openNew} className="mt-3 btn-gradient text-xs px-4 py-2 rounded-lg">Criar primeira regra</button>
          </div>
        )}
      </div>

      {/* Selection summary */}
      {regrasSelecionadas.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-xs text-purple-700 font-medium">{regrasSelecionadas.length} regra(s) selecionada(s) para o cálculo</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-nexus-border">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-nexus-muted hover:text-nexus-text border border-nexus-border rounded-xl hover:bg-nexus-bg transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <button onClick={onNext} disabled={regrasSelecionadas.length === 0} className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none">
          Avançar <ChevronRight size={16} />
        </button>
      </div>

      {/* ══════ Modal ══════ */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-modal animate-scaleIn my-8" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-nexus-border">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-nexus-text text-base">{modal === 'new' ? 'Nova Regra RV' : 'Editar Regra RV'}</h2>
                  <p className="text-[10px] text-nexus-muted mt-1">Tipos de RV → Configuração por cargo</p>
                </div>
                <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text p-1"><X size={20} /></button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
              <div className="space-y-3">
                {/* Step 0: Identificação */}
                <StepSection stepNumber={0} title="Identificação e Vigência" subtitle="Nome e período de vigência" icon={<FileText size={15} className="text-indigo-600" />} expanded={expandedSection === 'identificacao'} onToggle={() => toggleSection('identificacao')} completed={isIdentDone && expandedSection !== 'identificacao'}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Nome da Regra *</label>
                      <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30" placeholder="Ex: RV Vendas Tim 2026" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-nexus-muted mb-1.5 font-semibold uppercase">Descrição</label>
                      <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30" placeholder="Descrição opcional" />
                    </div>
                    <MonthYearPicker label="Vigência Início" value={form.vigencia_inicio} onChange={v => setForm({ ...form, vigencia_inicio: v })} />
                    <MonthYearPicker label="Vigência Fim" value={form.vigencia_fim} onChange={v => setForm({ ...form, vigencia_fim: v })} />
                  </div>
                </StepSection>

                {/* Step 1: Cargos */}
                <StepSection stepNumber={1} title="Tipos de RV por Cargo" subtitle="Selecione quais cargos terão RV" icon={<Users size={15} className="text-blue-600" />} expanded={expandedSection === 'cargos'} onToggle={() => toggleSection('cargos')} completed={isCargosDone && expandedSection !== 'cargos'}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TIPOS_CARGO.map(tc => {
                        const sel = form.cargosSelecionados.includes(tc.value);
                        return (
                          <button key={tc.value} onClick={() => toggleCargo(tc.value)} className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${sel ? `${tc.color} border-current shadow-sm` : 'border-nexus-border hover:border-purple-200 bg-white'}`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${sel ? 'bg-white/80' : 'bg-nexus-bg'}`}>{sel && <Check size={14} className="text-current" />}</div>
                            <span className={`text-xs font-semibold ${sel ? '' : 'text-nexus-text'}`}>{tc.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {form.cargosSelecionados.length > 0 && <p className="text-[10px] text-nexus-muted">{form.cargosSelecionados.length} tipo(s) — configure cada um abaixo</p>}
                  </div>
                </StepSection>

                {/* Step 2: Config */}
                {form.cargosSelecionados.length > 0 && (
                  <StepSection stepNumber={2} title="Configuração das Sub-RVs" subtitle="Regras, faixas e condições por cargo" icon={<Award size={15} className="text-purple-600" />} expanded={expandedSection === 'config'} onToggle={() => toggleSection('config')} completed={form.planos.length > 0 && expandedSection !== 'config'}>
                    <div className="space-y-4">
                      <div className="flex gap-1.5 flex-wrap border-b border-nexus-border pb-3">
                        {form.cargosSelecionados.map(cargo => {
                          const tc = TIPOS_CARGO.find(t => t.value === cargo);
                          const isActive = activeCargoTab === cargo;
                          return <button key={cargo} onClick={() => setActiveCargoTab(cargo)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive ? `${tc?.color} border shadow-sm` : 'bg-nexus-bg text-nexus-muted hover:bg-purple-50'}`}>{tc?.label}</button>;
                        })}
                      </div>
                      {activeCargoTab && (() => {
                        const plano = form.planos.find(p => p.tipo_cargo === activeCargoTab);
                        if (!plano) return null;
                        return <CargoPlanoEditor plano={plano} onChange={updated => updatePlano(activeCargoTab, updated)} allPlanos={form.planos} indicadores={indicadores} />;
                      })()}
                    </div>
                  </StepSection>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-nexus-border flex justify-end">
              <button onClick={save} disabled={saving || !form.nome || form.cargosSelecionados.length === 0} className="px-6 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Salvando...' : 'Salvar Regra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
