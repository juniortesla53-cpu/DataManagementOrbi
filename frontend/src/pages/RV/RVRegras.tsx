import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';

export default function RVRegras() {
  const { data: regras, loading, error, refetch } = useApi<any[]>('/rv/regras');
  const { data: indicadores } = useApi<any[]>('/rv/indicadores');
  const { showSuccess, showError } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { nome: '', descricao: '', tipo: 'faixa', vigencia_inicio: '', vigencia_fim: '',
    faixas: [{ id_indicador: '', faixa_min: 0, faixa_max: 100, valor_payout: 0, tipo_payout: 'valor_fixo' }],
    condicoes: [] as any[]
  };
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setModal('new'); };
  const openEdit = (r: any) => {
    setForm({
      nome: r.nome, descricao: r.descricao || '', tipo: r.tipo,
      vigencia_inicio: r.vigencia_inicio || '', vigencia_fim: r.vigencia_fim || '',
      faixas: r.faixas.map((f: any) => ({ id_indicador: f.id_indicador, faixa_min: f.faixa_min, faixa_max: f.faixa_max ?? 999, valor_payout: f.valor_payout, tipo_payout: f.tipo_payout })),
      condicoes: r.condicoes.map((c: any) => ({ id_indicador: c.id_indicador, operador: c.operador, valor_referencia: c.valor_referencia })),
    });
    setModal(r.id);
  };

  const addFaixa = () => setForm({...form, faixas: [...form.faixas, { id_indicador: form.faixas[0]?.id_indicador || '', faixa_min: 0, faixa_max: 100, valor_payout: 0, tipo_payout: 'valor_fixo' }]});
  const removeFaixa = (i: number) => setForm({...form, faixas: form.faixas.filter((_, idx) => idx !== i)});
  const updateFaixa = (i: number, field: string, value: any) => { const f = [...form.faixas]; (f[i] as any)[field] = value; setForm({...form, faixas: f}); };

  const addCondicao = () => setForm({...form, condicoes: [...form.condicoes, { id_indicador: '', operador: '>=', valor_referencia: 0 }]});
  const removeCondicao = (i: number) => setForm({...form, condicoes: form.condicoes.filter((_, idx) => idx !== i)});
  const updateCondicao = (i: number, field: string, value: any) => { const c = [...form.condicoes]; (c[i] as any)[field] = value; setForm({...form, condicoes: c}); };

  const save = async () => {
    if (!form.nome || form.faixas.length === 0) { showError('Nome e pelo menos uma faixa são obrigatórios'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        faixas: form.faixas.map(f => ({ ...f, id_indicador: parseInt(f.id_indicador as any), faixa_min: parseFloat(f.faixa_min as any), faixa_max: parseFloat(f.faixa_max as any), valor_payout: parseFloat(f.valor_payout as any) })),
        condicoes: form.condicoes.map(c => ({ ...c, id_indicador: parseInt(c.id_indicador as any), valor_referencia: parseFloat(c.valor_referencia as any) })),
      };
      if (modal === 'new') { await api.post('/rv/regras', payload); showSuccess('Regra criada'); }
      else { await api.put(`/rv/regras/${modal}`, { ...payload, ativo: 1 }); showSuccess('Regra atualizada'); }
      setModal(null); refetch();
    } catch (err: any) { showError(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar esta regra?')) return;
    try { await api.delete(`/rv/regras/${id}`); showSuccess('Regra desativada'); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-nexus-text">Regras de Cálculo</h1>
          <p className="text-xs text-nexus-muted">Configure as regras de remuneração variável com faixas e condições</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold"><Plus size={14} /> Nova Regra</button>
      </div>

      <div className="space-y-3">
        {(regras || []).map(r => (
          <div key={r.id} className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-nexus-bg/50 transition-colors" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{r.ativo ? 'Ativa' : 'Inativa'}</span>
                <div>
                  <p className="font-semibold text-sm text-nexus-text">{r.nome}</p>
                  <p className="text-[11px] text-nexus-muted">{r.descricao} · {r.faixas.length} faixas · {r.condicoes.length} condições</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1 text-nexus-muted hover:text-nexus-purple"><Edit2 size={14} /></button>
                <button onClick={e => { e.stopPropagation(); remove(r.id); }} className="p-1 text-nexus-muted hover:text-nexus-danger"><Trash2 size={14} /></button>
                {expanded === r.id ? <ChevronUp size={16} className="text-nexus-muted" /> : <ChevronDown size={16} className="text-nexus-muted" />}
              </div>
            </div>
            {expanded === r.id && (
              <div className="px-4 pb-4 border-t border-nexus-border pt-3 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-nexus-muted uppercase mb-2">Faixas</p>
                  <div className="space-y-1">
                    {r.faixas.map((f: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-nexus-bg rounded-lg px-3 py-2">
                        <span className="text-nexus-purple font-semibold">{f.indicador_codigo}</span>
                        <span className="text-nexus-muted">de {f.faixa_min}% até {f.faixa_max ?? '∞'}%</span>
                        <span className="text-nexus-muted">→</span>
                        <span className="font-bold text-nexus-text">{f.tipo_payout === 'valor_fixo' ? `R$ ${f.valor_payout}` : `${f.valor_payout}%`}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {r.condicoes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-nexus-muted uppercase mb-2">Condições</p>
                    {r.condicoes.map((c: any, i: number) => (
                      <div key={i} className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2">
                        <span className="font-semibold">{c.indicador_codigo}</span> {c.operador} {c.valor_referencia}%
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-nexus-muted">
                  Vigência: {r.vigencia_inicio || '—'} até {r.vigencia_fim || '—'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal criar/editar */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-modal animate-scaleIn my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-nexus-text">{modal === 'new' ? 'Nova Regra' : 'Editar Regra'}</h2>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text"><X size={18} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Campos básicos */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Nome</label>
                  <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Descrição</label>
                  <input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Vigência início</label>
                    <input type="month" value={form.vigencia_inicio} onChange={e => setForm({...form, vigencia_inicio: e.target.value})} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Vigência fim</label>
                    <input type="month" value={form.vigencia_fim} onChange={e => setForm({...form, vigencia_fim: e.target.value})} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                  </div>
                </div>
              </div>

              {/* Faixas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-nexus-muted font-semibold uppercase">Faixas de pagamento</label>
                  <button onClick={addFaixa} className="text-[10px] text-nexus-purple font-semibold hover:underline">+ Adicionar faixa</button>
                </div>
                <div className="space-y-2">
                  {form.faixas.map((f, i) => (
                    <div key={i} className="bg-nexus-bg rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-nexus-muted">Faixa {i + 1}</span>
                        {form.faixas.length > 1 && <button onClick={() => removeFaixa(i)} className="text-nexus-danger text-[10px]">Remover</button>}
                      </div>
                      <select value={f.id_indicador} onChange={e => updateFaixa(i, 'id_indicador', e.target.value)} className="w-full px-2 py-1.5 border border-nexus-border rounded text-xs bg-white">
                        <option value="">Selecione indicador...</option>
                        {(indicadores || []).filter(ind => ind.ativo).map(ind => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome}</option>)}
                      </select>
                      <div className="grid grid-cols-4 gap-2">
                        <div><label className="text-[9px] text-nexus-muted">Mín %</label><input type="number" value={f.faixa_min} onChange={e => updateFaixa(i, 'faixa_min', e.target.value)} className="w-full px-2 py-1 border border-nexus-border rounded text-xs bg-white" /></div>
                        <div><label className="text-[9px] text-nexus-muted">Máx %</label><input type="number" value={f.faixa_max} onChange={e => updateFaixa(i, 'faixa_max', e.target.value)} className="w-full px-2 py-1 border border-nexus-border rounded text-xs bg-white" /></div>
                        <div><label className="text-[9px] text-nexus-muted">Payout</label><input type="number" value={f.valor_payout} onChange={e => updateFaixa(i, 'valor_payout', e.target.value)} className="w-full px-2 py-1 border border-nexus-border rounded text-xs bg-white" /></div>
                        <div><label className="text-[9px] text-nexus-muted">Tipo</label>
                          <select value={f.tipo_payout} onChange={e => updateFaixa(i, 'tipo_payout', e.target.value)} className="w-full px-1 py-1 border border-nexus-border rounded text-[10px] bg-white">
                            <option value="valor_fixo">R$ Fixo</option><option value="percentual_salario">% Salário</option><option value="percentual_indicador">% Indicador</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Condições */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-nexus-muted font-semibold uppercase">Condições (pré-requisitos)</label>
                  <button onClick={addCondicao} className="text-[10px] text-nexus-purple font-semibold hover:underline">+ Adicionar condição</button>
                </div>
                <div className="space-y-2">
                  {form.condicoes.map((c, i) => (
                    <div key={i} className="bg-amber-50 rounded-lg p-3 flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-[9px] text-nexus-muted">Indicador</label>
                        <select value={c.id_indicador} onChange={e => updateCondicao(i, 'id_indicador', e.target.value)} className="w-full px-2 py-1 border border-nexus-border rounded text-xs bg-white">
                          <option value="">Selecione...</option>
                          {(indicadores || []).filter(ind => ind.ativo).map(ind => <option key={ind.id} value={ind.id}>{ind.codigo}</option>)}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="text-[9px] text-nexus-muted">Op.</label>
                        <select value={c.operador} onChange={e => updateCondicao(i, 'operador', e.target.value)} className="w-full px-1 py-1 border border-nexus-border rounded text-xs bg-white">
                          <option value=">=">≥</option><option value="<=">≤</option><option value=">">{'>'}</option><option value="<">{'<'}</option><option value="==">＝</option><option value="!=">≠</option>
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="text-[9px] text-nexus-muted">Valor</label>
                        <input type="number" value={c.valor_referencia} onChange={e => updateCondicao(i, 'valor_referencia', e.target.value)} className="w-full px-2 py-1 border border-nexus-border rounded text-xs bg-white" />
                      </div>
                      <button onClick={() => removeCondicao(i)} className="p-1 text-nexus-danger"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={save} disabled={saving} className="mt-5 w-full py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Salvando...' : 'Salvar Regra'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
