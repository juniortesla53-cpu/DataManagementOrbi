import { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, X, Loader2, ChevronRight, ChevronLeft, AlertCircle, Power, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';

interface Props {
  clienteIds: number[];
  onNext: () => void;
  onBack: () => void;
}

export default function StepIndicadores({ clienteIds, onNext, onBack }: Props) {
  const navigate = useNavigate();
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbError, setDbError] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', descricao: '', unidade: '%', tipo: 'percentual' });
  const [saving, setSaving] = useState(false);

  const fetchIndicadores = async () => {
    setLoading(true);
    setDbError(false);
    try {
      const params = clienteIds.length > 0 ? `?id_cliente=${clienteIds[0]}` : '';
      const { data } = await api.get(`/rv/indicadores${params}`);
      setIndicadores(data);
      setError(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || '';
      if (msg.includes('no such column') || msg.includes('SQLITE_ERROR')) {
        setDbError(true);
        setError('A estrutura do banco de dados precisa ser atualizada. Reinicie o servidor backend.');
      } else {
        setError(msg || 'Erro ao carregar indicadores');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIndicadores(); }, [clienteIds]);

  const ativos = indicadores.filter(i => i.ativo);

  const openNew = () => {
    setForm({ codigo: '', nome: '', descricao: '', unidade: '%', tipo: 'percentual' });
    setModal('new');
  };

  const openEdit = (i: any) => {
    setForm({ codigo: i.codigo, nome: i.nome, descricao: i.descricao || '', unidade: i.unidade, tipo: i.tipo });
    setModal(i.id);
  };

  const save = async () => {
    if (!form.codigo || !form.nome) return;
    setSaving(true);
    try {
      const payload = { ...form, id_cliente: clienteIds[0] || null };
      if (modal === 'new') {
        await api.post('/rv/indicadores', payload);
      } else {
        await api.put(`/rv/indicadores/${modal}`, { ...payload, ativo: 1 });
      }
      setModal(null);
      fetchIndicadores();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar este indicador?')) return;
    try {
      await api.delete(`/rv/indicadores/${id}`);
      fetchIndicadores();
    } catch {}
  };

  const toggleAtivo = async (ind: any) => {
    const novoStatus = ind.ativo ? 0 : 1;
    try {
      await api.put(`/rv/indicadores/${ind.id}`, { ...ind, ativo: novoStatus, id_cliente: clienteIds[0] || null });
      fetchIndicadores();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao alterar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-nexus-purple" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-10 text-center space-y-4">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${dbError ? 'bg-amber-100' : 'bg-red-100'}`}>
          {dbError ? <Database size={28} className="text-amber-600" /> : <AlertCircle size={28} className="text-red-500" />}
        </div>
        <div>
          <p className="text-base font-bold text-nexus-text mb-1">{dbError ? 'Configuração necessária' : 'Erro ao carregar'}</p>
          <p className="text-sm text-nexus-muted">{error}</p>
        </div>
        {dbError && (
          <button
            onClick={() => navigate('/rv/fontes-config')}
            className="inline-flex items-center gap-2 px-5 py-2.5 btn-gradient rounded-xl text-sm font-semibold"
          >
            <Database size={16} /> Ir para Fontes de Dados
          </button>
        )}
        <button onClick={onBack} className="block mx-auto text-xs text-nexus-muted hover:text-nexus-text underline">
          ← Voltar para seleção de cliente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target size={16} className="text-nexus-purple" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-nexus-text">Indicadores (KPIs)</h3>
              <p className="text-[10px] text-nexus-muted">Verifique os indicadores que compõem a RV. Adicione ou edite conforme necessário.</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 btn-gradient rounded-lg text-xs font-semibold">
            <Plus size={14} /> Novo
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-nexus-bg rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-nexus-text">{ativos.length}</p>
            <p className="text-[10px] text-nexus-muted">Ativos</p>
          </div>
          <div className="bg-nexus-bg rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-nexus-text">{ativos.filter(i => i.tipo === 'percentual').length}</p>
            <p className="text-[10px] text-nexus-muted">Percentuais</p>
          </div>
          <div className="bg-nexus-bg rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-nexus-text">{ativos.filter(i => i.tipo !== 'percentual').length}</p>
            <p className="text-[10px] text-nexus-muted">Quantidade/Valor</p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexus-border bg-nexus-bg text-nexus-muted text-xs">
              <th className="text-left p-3 font-semibold">Código</th>
              <th className="text-left p-3 font-semibold">Nome</th>
              <th className="text-left p-3 font-semibold">Unidade</th>
              <th className="text-left p-3 font-semibold">Tipo</th>
              <th className="text-left p-3 font-semibold">Status</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {indicadores.map(i => (
              <tr key={i.id} className="border-b border-nexus-borderLight hover:bg-nexus-bg/50 transition-colors">
                <td className="p-3 font-mono text-xs text-nexus-purple font-semibold">{i.codigo}</td>
                <td className="p-3 font-medium text-nexus-text">{i.nome}</td>
                <td className="p-3 text-nexus-textSecondary">{i.unidade}</td>
                <td className="p-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">{i.tipo}</span>
                </td>
                <td className="p-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${i.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {i.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3 text-right space-x-1">
                  <button
                    onClick={() => toggleAtivo(i)}
                    className={`p-1 transition-colors ${i.ativo ? 'text-emerald-600 hover:text-emerald-700' : 'text-nexus-muted hover:text-nexus-text'}`}
                    title={i.ativo ? 'Desativar' : 'Ativar'}
                  >
                    <Power size={14} />
                  </button>
                  <button onClick={() => openEdit(i)} className="p-1 text-nexus-muted hover:text-nexus-purple transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => remove(i.id)} className="p-1 text-nexus-muted hover:text-nexus-danger transition-colors"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {indicadores.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-nexus-muted text-sm">Nenhum indicador cadastrado. Crie pelo menos um para continuar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Navegação */}
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-nexus-textSecondary bg-nexus-bg border border-nexus-border hover:border-nexus-muted transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={ativos.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
        >
          Próximo <ChevronRight size={16} />
        </button>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-nexus-text">{modal === 'new' ? 'Novo Indicador' : 'Editar Indicador'}</h2>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Código</label>
                  <input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" placeholder="VENDAS_REALIZADAS" />
                </div>
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Nome</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Unidade</label>
                  <select value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs">
                    <option value="%">%</option><option value="un">un</option><option value="s">s</option><option value="R$">R$</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs">
                    <option value="percentual">Percentual</option><option value="quantidade">Quantidade</option><option value="valor">Valor</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={save} disabled={saving} className="mt-5 w-full py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
