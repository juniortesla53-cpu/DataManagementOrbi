import { useState, useEffect } from 'react';
import { Settings2, Plus, Edit2, Trash2, X, Loader2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, CheckSquare, Square, AlertCircle, Power } from 'lucide-react';
import api from '../../../api';

interface Props {
  clienteId: number | null;
  regrasSelecionadas: number[];
  setRegrasSelecionadas: (r: number[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepRegras({ clienteId, regrasSelecionadas, setRegrasSelecionadas, onNext, onBack }: Props) {
  const [regras, setRegras] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    nome: '', descricao: '', tipo: 'faixa', vigencia_inicio: '', vigencia_fim: '',
    faixas: [{ id_indicador: '', faixa_min: 0, faixa_max: 100, valor_payout: 0, tipo_payout: 'valor_fixo' }],
    condicoes: [] as any[]
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = clienteId ? `?id_cliente=${clienteId}` : '';
      const [regrasRes, indRes] = await Promise.all([api.get(`/rv/regras${params}`), api.get(`/rv/indicadores${params}`)]);
      setRegras(regrasRes.data);
      setIndicadores(indRes.data.filter((i: any) => i.ativo));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [clienteId]);

  // Auto-selecionar todas as regras ativas na primeira carga
  useEffect(() => {
    if (regras.length > 0 && regrasSelecionadas.length === 0) {
      setRegrasSelecionadas(regras.filter(r => r.ativo).map(r => r.id));
    }
  }, [regras]);

  const ativas = regras.filter(r => r.ativo);

  const toggleRegra = (id: number) => {
    if (regrasSelecionadas.includes(id)) {
      setRegrasSelecionadas(regrasSelecionadas.filter(r => r !== id));
    } else {
      setRegrasSelecionadas([...regrasSelecionadas, id]);
    }
  };

  const toggleTodas = () => {
    if (regrasSelecionadas.length === ativas.length) {
      setRegrasSelecionadas([]);
    } else {
      setRegrasSelecionadas(ativas.map(r => r.id));
    }
  };

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

  const addFaixa = () => setForm({ ...form, faixas: [...form.faixas, { id_indicador: form.faixas[0]?.id_indicador || '', faixa_min: 0, faixa_max: 100, valor_payout: 0, tipo_payout: 'valor_fixo' }] });
  const removeFaixa = (i: number) => setForm({ ...form, faixas: form.faixas.filter((_, idx) => idx !== i) });
  const updateFaixa = (i: number, field: string, value: any) => { const f = [...form.faixas]; (f[i] as any)[field] = value; setForm({ ...form, faixas: f }); };

  const addCondicao = () => setForm({ ...form, condicoes: [...form.condicoes, { id_indicador: '', operador: '>=', valor_referencia: 0 }] });
  const removeCondicao = (i: number) => setForm({ ...form, condicoes: form.condicoes.filter((_, idx) => idx !== i) });
  const updateCondicao = (i: number, field: string, value: any) => { const c = [...form.condicoes]; (c[i] as any)[field] = value; setForm({ ...form, condicoes: c }); };

  const save = async () => {
    if (!form.nome || form.faixas.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        id_cliente: clienteId,
        faixas: form.faixas.map(f => ({ ...f, id_indicador: parseInt(f.id_indicador as any), faixa_min: parseFloat(f.faixa_min as any), faixa_max: parseFloat(f.faixa_max as any), valor_payout: parseFloat(f.valor_payout as any) })),
        condicoes: form.condicoes.map(c => ({ ...c, id_indicador: parseInt(c.id_indicador as any), valor_referencia: parseFloat(c.valor_referencia as any) })),
      };
      if (modal === 'new') {
        await api.post('/rv/regras', payload);
      } else {
        await api.put(`/rv/regras/${modal}`, { ...payload, ativo: 1 });
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
      await api.delete(`/rv/regras/${id}`);
      setRegrasSelecionadas(regrasSelecionadas.filter(r => r !== id));
      fetchData();
    } catch {}
  };

  const toggleAtivo = async (regra: any) => {
    const novoStatus = regra.ativo ? 0 : 1;
    try {
      await api.put(`/rv/regras/${regra.id}`, {
        ...regra,
        ativo: novoStatus,
        id_cliente: clienteId,
        faixas: regra.faixas,
        condicoes: regra.condicoes,
      });
      if (novoStatus === 0) {
        setRegrasSelecionadas(regrasSelecionadas.filter(r => r !== regra.id));
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao alterar status');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-nexus-purple" /></div>;
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle size={32} className="text-nexus-danger mx-auto mb-3" />
        <p className="text-sm text-nexus-text font-medium">{error}</p>
        <button onClick={onBack} className="mt-4 text-sm text-nexus-purple hover:underline">← Voltar</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Settings2 size={16} className="text-nexus-blue" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-nexus-text">Regras de Cálculo</h3>
              <p className="text-[10px] text-nexus-muted">Selecione as regras que serão aplicadas neste cálculo. Você pode criar ou editar regras aqui.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTodas} className="text-xs font-medium text-nexus-purple hover:text-nexus-purpleDark transition-colors">
              {regrasSelecionadas.length === ativas.length ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 btn-gradient rounded-lg text-xs font-semibold">
              <Plus size={14} /> Nova Regra
            </button>
          </div>
        </div>

        <div className="text-xs text-nexus-muted">
          {regrasSelecionadas.length} de {ativas.length} regras selecionadas
        </div>
      </div>

      {/* Lista de regras com seleção */}
      <div className="space-y-2">
        {ativas.map(r => {
          const selecionada = regrasSelecionadas.includes(r.id);
          const isExpanded = expanded === r.id;

          return (
            <div key={r.id} className={`card overflow-hidden transition-all ${selecionada ? 'ring-1 ring-nexus-purple/30' : ''}`}>
              <div className="flex items-center gap-3 p-4">
                {/* Checkbox */}
                <button onClick={() => toggleRegra(r.id)} className="flex-shrink-0">
                  {selecionada ? (
                    <CheckSquare size={20} className="text-nexus-purple" />
                  ) : (
                    <Square size={20} className="text-nexus-muted" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : r.id)}>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${selecionada ? 'text-nexus-purple' : 'text-nexus-text'}`}>{r.nome}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-nexus-bg text-nexus-muted font-medium">
                      {r.faixas?.length || 0} faixas
                    </span>
                    {r.condicoes?.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                        {r.condicoes.length} condição(ões)
                      </span>
                    )}
                  </div>
                  {r.descricao && <p className="text-[11px] text-nexus-muted truncate mt-0.5">{r.descricao}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAtivo(r); }}
                    className={`p-1.5 transition-colors ${r.ativo ? 'text-emerald-600 hover:text-emerald-700' : 'text-nexus-muted hover:text-nexus-text'}`}
                    title={r.ativo ? 'Desativar' : 'Ativar'}
                  >
                    <Power size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 text-nexus-muted hover:text-nexus-purple transition-colors"><Edit2 size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); remove(r.id); }} className="p-1.5 text-nexus-muted hover:text-nexus-danger transition-colors"><Trash2 size={14} /></button>
                  <button onClick={() => setExpanded(isExpanded ? null : r.id)} className="p-1.5 text-nexus-muted">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-nexus-border pt-3 space-y-3 ml-8">
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
          );
        })}

        {ativas.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-nexus-muted">Nenhuma regra ativa. Crie pelo menos uma para continuar.</p>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-nexus-textSecondary bg-nexus-bg border border-nexus-border hover:border-nexus-muted transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={regrasSelecionadas.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
        >
          Próximo <ChevronRight size={16} />
        </button>
      </div>

      {/* Modal criar/editar regra */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-modal animate-scaleIn my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-nexus-text">{modal === 'new' ? 'Nova Regra' : 'Editar Regra'}</h2>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text"><X size={18} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Nome</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Descrição</label>
                  <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Vigência início</label>
                    <input type="month" value={form.vigencia_inicio} onChange={e => setForm({ ...form, vigencia_inicio: e.target.value })} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Vigência fim</label>
                    <input type="month" value={form.vigencia_fim} onChange={e => setForm({ ...form, vigencia_fim: e.target.value })} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
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
                        {indicadores.map(ind => <option key={ind.id} value={ind.id}>{ind.codigo} — {ind.nome}</option>)}
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
                          {indicadores.map(ind => <option key={ind.id} value={ind.id}>{ind.codigo}</option>)}
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
