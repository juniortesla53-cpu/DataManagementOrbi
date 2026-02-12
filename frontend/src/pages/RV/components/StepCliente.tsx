import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, X, Loader2, ChevronRight, Search, AlertCircle } from 'lucide-react';
import api from '../../../api';

interface Props {
  clienteSelecionado: number | null;
  setClienteSelecionado: (id: number | null) => void;
  onNext: () => void;
}

export default function StepCliente({ clienteSelecionado, setClienteSelecionado, onNext }: Props) {
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

  const selecionar = (id: number) => {
    setClienteSelecionado(id);
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Building2 size={16} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-nexus-text">Escolha do Cliente</h3>
              <p className="text-[10px] text-nexus-muted">Selecione o cliente para configurar a RV. Cada cliente tem suas próprias métricas e regras.</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 btn-gradient rounded-lg text-xs font-semibold">
            <Plus size={14} /> Novo Cliente
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome..."
            className="w-full pl-9 pr-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-nexus-purple"
          />
        </div>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtrados.map(c => {
          const selecionado = clienteSelecionado === c.id;

          return (
            <div
              key={c.id}
              onClick={() => selecionar(c.id)}
              className={`card p-4 cursor-pointer transition-all hover:shadow-md ${
                selecionado ? 'ring-2 ring-nexus-purple bg-purple-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.nome} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-nexus-bg flex items-center justify-center">
                      <Building2 size={20} className="text-nexus-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${selecionado ? 'text-nexus-purple' : 'text-nexus-text'}`}>
                      {c.nome}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(c);
                  }}
                  className="p-1 text-nexus-muted hover:text-nexus-purple transition-colors"
                >
                  <Edit2 size={12} />
                </button>
              </div>
              {c.descricao && (
                <p className="text-[11px] text-nexus-muted line-clamp-2">{c.descricao}</p>
              )}
              {selecionado && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-nexus-purple">
                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-purple animate-pulse"></div>
                    Selecionado
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtrados.length === 0 && (
          <div className="col-span-full card p-8 text-center">
            <p className="text-sm text-nexus-muted">
              {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado. Crie um para começar.'}
            </p>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!clienteSelecionado}
          className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
        >
          Próximo <ChevronRight size={16} />
        </button>
      </div>

      {/* Modal Criar/Editar */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-nexus-text">{modal === 'new' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Nome do Cliente</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs"
                  placeholder="Ex: Tim Brasil"
                />
              </div>
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs resize-none"
                  rows={3}
                  placeholder="Breve descrição do cliente..."
                />
              </div>
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Logo URL (opcional)</label>
                <input
                  type="text"
                  value={form.logo_url}
                  onChange={e => setForm({ ...form, logo_url: e.target.value })}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs"
                  placeholder="https://..."
                />
              </div>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="mt-5 w-full py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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
