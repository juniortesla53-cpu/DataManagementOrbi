import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, AlertCircle, Power } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';
import SearchBar from '../../components/SearchBar';

export default function RVIndicadores() {
  const { data: indicadores, loading, error, refetch } = useApi<any[]>('/rv/indicadores');
  const { showSuccess, showError } = useToast();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', descricao: '', unidade: '%', tipo: 'percentual' });
  const [saving, setSaving] = useState(false);

  const filtered = (indicadores || []).filter(i =>
    i.nome.toLowerCase().includes(search.toLowerCase()) || i.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm({ codigo: '', nome: '', descricao: '', unidade: '%', tipo: 'percentual' }); setModal('new'); };
  const openEdit = (i: any) => { setForm({ codigo: i.codigo, nome: i.nome, descricao: i.descricao || '', unidade: i.unidade, tipo: i.tipo }); setModal(i.id); };

  const save = async () => {
    if (!form.codigo || !form.nome) { showError('Código e nome são obrigatórios'); return; }
    setSaving(true);
    try {
      if (modal === 'new') { await api.post('/rv/indicadores', form); showSuccess('Indicador criado'); }
      else { await api.put(`/rv/indicadores/${modal}`, { ...form, ativo: 1 }); showSuccess('Indicador atualizado'); }
      setModal(null); refetch();
    } catch (err: any) { showError(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const toggleAtivo = async (ind: any) => {
    const novoStatus = ind.ativo ? 0 : 1;
    try {
      await api.put(`/rv/indicadores/${ind.id}`, { codigo: ind.codigo, nome: ind.nome, descricao: ind.descricao || '', unidade: ind.unidade, tipo: ind.tipo, ativo: novoStatus, id_cliente: ind.id_cliente || null });
      showSuccess(novoStatus ? 'Indicador ativado' : 'Indicador desativado');
      refetch();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Excluir permanentemente este indicador?')) return;
    try { await api.delete(`/rv/indicadores/${id}`); showSuccess('Indicador desativado'); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-nexus-text">Indicadores</h1>
          <p className="text-xs text-nexus-muted">Dimensão — defina os KPIs que compõem a remuneração variável</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold"><Plus size={14} /> Novo</button>
      </div>

      <div className="max-w-xs"><SearchBar value={search} onChange={setSearch} placeholder="Buscar indicadores..." /></div>

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
            {filtered.map(i => (
              <tr key={i.id} className={`border-b border-nexus-borderLight hover:bg-nexus-bg/50 transition-colors ${!i.ativo ? 'opacity-60 bg-gray-50/50' : ''}`}>
                <td className={`p-3 font-mono text-xs font-semibold ${i.ativo ? 'text-nexus-purple' : 'text-nexus-muted'}`}>{i.codigo}</td>
                <td className={`p-3 font-medium ${i.ativo ? 'text-nexus-text' : 'text-nexus-muted'}`}>{i.nome}</td>
                <td className="p-3 text-nexus-textSecondary">{i.unidade}</td>
                <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">{i.tipo}</span></td>
                <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${i.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{i.ativo ? 'Ativo' : 'Inativo'}</span></td>
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
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-nexus-text">{modal === 'new' ? 'Novo Indicador' : 'Editar Indicador'}</h2>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Código</label>
                <input type="text" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" placeholder="VENDAS_REALIZADAS" />
              </div>
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Nome</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" />
              </div>
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Descrição</label>
                <input type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Unidade</label>
                  <select value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs">
                    <option value="%">%</option><option value="un">un</option><option value="s">s</option><option value="R$">R$</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs">
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
