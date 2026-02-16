import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, X, Loader2, ArrowDown, Search, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../../api';

interface Props {
  clientesSelecionados: number[];
  setClientesSelecionados: (ids: number[]) => void;
  onNext: () => void;
}

export default function StepCliente({ clientesSelecionados, setClientesSelecionados, onNext }: Props) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', logo_url: '' });
  const [saving, setSaving] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rv/clientes');
      setClientes(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientes(); }, []);

  const ativos = clientes.filter(c => c.ativo);
  const filtrados = ativos.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  const openNew = () => {
    setForm({ nome: '', descricao: '', logo_url: '' });
    setModal('new');
  };

  const openEdit = (c: any) => {
    setForm({ nome: c.nome, descricao: c.descricao || '', logo_url: c.logo_url || '' });
    setModal(c.id);
  };

  const save = async () => {
    if (!form.nome) return;
    setSaving(true);
    try {
      if (modal === 'new') {
        await api.post('/rv/clientes', form);
      } else {
        await api.put(`/rv/clientes/${modal}`, { ...form, ativo: 1 });
      }
      setModal(null);
      fetchClientes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: number) => {
    if (clientesSelecionados.includes(id)) {
      setClientesSelecionados(clientesSelecionados.filter(i => i !== id));
    } else {
      setClientesSelecionados([...clientesSelecionados, id]);
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
      <div className="card p-8 text-center">
        <AlertCircle size={32} className="text-nexus-danger mx-auto mb-3" />
        <p className="text-sm text-nexus-text font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-nexus-text">Escolha do(s) Cliente(s)</h3>
              <p className="text-xs text-nexus-muted">Selecione um ou mais clientes. Clientes com a mesma regra de RV podem ser selecionados juntos.</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold">
            <Plus size={14} /> Novo Cliente
          </button>
        </div>

        {/* Busca + Selecionados */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar cliente por nome..."
              className="w-full pl-9 pr-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
            />
          </div>
          {clientesSelecionados.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <CheckCircle size={14} className="text-nexus-purple" />
              <span className="text-xs font-semibold text-nexus-purple">
                {clientesSelecionados.length} selecionado{clientesSelecionados.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtrados.map(c => {
          const selected = clientesSelecionados.includes(c.id);
          return (
            <div
              key={c.id}
              onClick={() => toggleSelect(c.id)}
              className={`card p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                selected
                  ? 'ring-2 ring-nexus-purple bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md'
                  : 'hover:ring-1 hover:ring-nexus-border'
              }`}
            >
              {/* Checkbox indicator */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.nome} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow" />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow ${
                      selected ? 'bg-nexus-purple' : 'bg-gradient-to-br from-slate-100 to-slate-200'
                    }`}>
                      <Building2 size={22} className={selected ? 'text-white' : 'text-slate-400'} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold leading-tight ${selected ? 'text-nexus-purple' : 'text-nexus-text'}`}>
                      {c.nome}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      c.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                    className="p-1.5 text-nexus-muted hover:text-nexus-purple hover:bg-purple-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    selected
                      ? 'bg-nexus-purple border-nexus-purple'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {selected && <CheckCircle size={12} className="text-white" />}
                  </div>
                </div>
              </div>

              {c.descricao && (
                <p className="text-[11px] text-nexus-muted line-clamp-2 mt-2">{c.descricao}</p>
              )}

              {selected && (
                <div className="mt-3 pt-2 border-t border-purple-200">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-nexus-purple">
                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-purple animate-pulse" />
                    Selecionado
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtrados.length === 0 && (
          <div className="col-span-full card p-10 text-center">
            <Building2 size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-nexus-muted">
              {busca ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado. Crie um para começar.'}
            </p>
            {!busca && (
              <button onClick={openNew} className="mt-3 btn-gradient text-sm px-4 py-2 rounded-lg">
                Criar primeiro cliente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex justify-center">
        <button
          onClick={onNext}
          disabled={clientesSelecionados.length === 0}
          className="flex items-center gap-2 px-8 py-3 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all"
        >
          Próximo <ArrowDown size={16} />
        </button>
      </div>

      {/* Modal Criar/Editar */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Building2 size={20} className="text-white" />
                </div>
                <h2 className="font-bold text-nexus-text text-lg">{modal === 'new' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
              </div>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text p-1">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Nome do Cliente *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
                  placeholder="Ex: Tim Brasil"
                />
              </div>
              <div>
                <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-4 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
                  rows={3}
                  placeholder="Breve descrição do cliente..."
                />
              </div>
              <div>
                <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Logo URL (opcional)</label>
                <input
                  type="text"
                  value={form.logo_url}
                  onChange={e => setForm({ ...form, logo_url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
                  placeholder="https://..."
                />
              </div>
            </div>
            <button
              onClick={save}
              disabled={saving || !form.nome}
              className="mt-6 w-full py-3 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
