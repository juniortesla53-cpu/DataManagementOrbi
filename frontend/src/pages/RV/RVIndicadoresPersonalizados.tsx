import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, AlertCircle, Power, HelpCircle, Check } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';
import SearchBar from '../../components/SearchBar';

export default function RVIndicadoresPersonalizados() {
  const { data: indicadores, loading, error, refetch } = useApi<any[]>('/rv/indicadores-personalizados');
  const { showSuccess, showError } = useToast();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', descricao: '', expressao: '', unidade: '%' });
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testeResultado, setTesteResultado] = useState<any>(null);

  const filtered = (indicadores || []).filter(i =>
    i.nome.toLowerCase().includes(search.toLowerCase()) || 
    i.codigo.toLowerCase().includes(search.toLowerCase()) ||
    i.expressao.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { 
    setForm({ codigo: '', nome: '', descricao: '', expressao: '', unidade: '%' }); 
    setTesteResultado(null);
    setModal('new'); 
  };
  
  const openEdit = (i: any) => { 
    setForm({ 
      codigo: i.codigo, 
      nome: i.nome, 
      descricao: i.descricao || '', 
      expressao: i.expressao,
      unidade: i.unidade 
    }); 
    setTesteResultado(null);
    setModal(i.id); 
  };

  // Testar expressão
  const testarExpressao = async () => {
    if (!form.expressao.trim()) {
      showError('Digite uma expressão para testar');
      return;
    }
    
    setTestando(true);
    try {
      const response = await api.post('/rv/indicadores-personalizados/testar-expressao', {
        expressao: form.expressao
      });
      setTesteResultado(response.data);
      if (response.data.valido) {
        showSuccess('Expressão válida!');
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao testar expressão');
      setTesteResultado(null);
    } finally {
      setTestando(false);
    }
  };

  const save = async () => {
    if (!form.codigo || !form.nome || !form.expressao) { 
      showError('Código, nome e expressão são obrigatórios'); 
      return; 
    }
    
    setSaving(true);
    try {
      if (modal === 'new') { 
        await api.post('/rv/indicadores-personalizados', form); 
        showSuccess('Indicador personalizado criado'); 
      } else { 
        await api.put(`/rv/indicadores-personalizados/${modal}`, { ...form, ativo: 1 }); 
        showSuccess('Indicador personalizado atualizado'); 
      }
      setModal(null); 
      refetch();
    } catch (err: any) { 
      showError(err.response?.data?.error || 'Erro ao salvar'); 
    } finally { 
      setSaving(false); 
    }
  };

  const toggleAtivo = async (ind: any) => {
    const novoStatus = ind.ativo ? 0 : 1;
    try {
      await api.put(`/rv/indicadores-personalizados/${ind.id}`, { 
        codigo: ind.codigo, 
        nome: ind.nome, 
        descricao: ind.descricao || '', 
        expressao: ind.expressao,
        unidade: ind.unidade, 
        ativo: novoStatus,
        id_cliente: ind.id_cliente || null 
      });
      showSuccess(novoStatus ? 'Indicador ativado' : 'Indicador desativado');
      refetch();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar este indicador personalizado?')) return;
    try { 
      await api.delete(`/rv/indicadores-personalizados/${id}`); 
      showSuccess('Indicador desativado'); 
      refetch(); 
    } catch (err: any) { 
      showError(err.response?.data?.error || 'Erro'); 
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-nexus-text">Indicadores Personalizados</h1>
          <p className="text-xs text-nexus-muted">Combine indicadores existentes usando expressões matemáticas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold">
          <Plus size={14} /> Novo
        </button>
      </div>

      <div className="max-w-xs">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar indicadores personalizados..." />
      </div>

      {/* Info box */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3 items-start">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Como criar expressões</h3>
            <p className="text-xs text-blue-700 mb-2">
              Use <code className="bg-blue-100 px-1 rounded">{'{CODIGO_INDICADOR}'}</code> para referenciar indicadores e operadores matemáticos básicos.
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Exemplos:</strong></p>
              <p><code className="bg-blue-100 px-1 rounded">{'{VENDAS} * {CSAT} / 100'}</code> — Performance combinada</p>
              <p><code className="bg-blue-100 px-1 rounded">{'({VENDAS} + {QUALIDADE}) / 2'}</code> — Média de indicadores</p>
              <p><code className="bg-blue-100 px-1 rounded">{'{VENDAS} * 1.2'}</code> — Vendas com bônus de 20%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexus-border bg-nexus-bg text-nexus-muted text-xs">
              <th className="text-left p-3 font-semibold">Código</th>
              <th className="text-left p-3 font-semibold">Nome</th>
              <th className="text-left p-3 font-semibold">Expressão</th>
              <th className="text-left p-3 font-semibold">Unidade</th>
              <th className="text-left p-3 font-semibold">Status</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-nexus-muted text-sm">
                  {search ? 'Nenhum indicador encontrado' : 'Nenhum indicador personalizado criado ainda'}
                </td>
              </tr>
            )}
            {filtered.map(i => (
              <tr key={i.id} className={`border-b border-nexus-borderLight hover:bg-nexus-bg/50 transition-colors ${!i.ativo ? 'opacity-60 bg-gray-50/50' : ''}`}>
                <td className={`p-3 font-mono text-xs font-semibold ${i.ativo ? 'text-nexus-purple' : 'text-nexus-muted'}`}>{i.codigo}</td>
                <td className={`p-3 font-medium ${i.ativo ? 'text-nexus-text' : 'text-nexus-muted'}`}>{i.nome}</td>
                <td className="p-3">
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono">
                    {i.expressao.length > 40 ? i.expressao.substring(0, 40) + '...' : i.expressao}
                  </code>
                </td>
                <td className="p-3 text-nexus-textSecondary">{i.unidade}</td>
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
                  <button onClick={() => openEdit(i)} className="p-1 text-nexus-muted hover:text-nexus-purple transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => remove(i.id)} className="p-1 text-nexus-muted hover:text-nexus-danger transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-modal animate-scaleIn max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-nexus-text">{modal === 'new' ? 'Novo Indicador Personalizado' : 'Editar Indicador Personalizado'}</h2>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text"><X size={18} /></button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Código</label>
                  <input 
                    type="text" 
                    value={form.codigo} 
                    onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" 
                    placeholder="PERF_COMBINADA" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Unidade</label>
                  <select 
                    value={form.unidade} 
                    onChange={e => setForm({...form, unidade: e.target.value})} 
                    className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs"
                  >
                    <option value="%">%</option>
                    <option value="un">un</option>
                    <option value="pontos">pontos</option>
                    <option value="R$">R$</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Nome</label>
                <input 
                  type="text" 
                  value={form.nome} 
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" 
                  placeholder="Performance Combinada"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Descrição (opcional)</label>
                <textarea 
                  value={form.descricao} 
                  onChange={e => setForm({...form, descricao: e.target.value})}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" 
                  rows={2}
                  placeholder="Combina vendas e satisfação do cliente"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Expressão Matemática</label>
                <textarea 
                  value={form.expressao} 
                  onChange={e => setForm({...form, expressao: e.target.value})}
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs font-mono transition-all" 
                  rows={3}
                  placeholder="{VENDAS} * {CSAT} / 100"
                />
                <p className="text-[10px] text-nexus-muted mt-1">
                  Use <code className="bg-nexus-bg px-1 rounded">{'{CODIGO}'}</code> para referenciar indicadores base. Operadores: +, -, *, /, ()
                </p>
              </div>

              <button 
                onClick={testarExpressao} 
                disabled={testando || !form.expressao.trim()}
                className="w-full py-2 border border-nexus-purple text-nexus-purple rounded-lg text-xs font-semibold hover:bg-nexus-purple/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testando ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Testar Expressão
                  </>
                )}
              </button>

              {testeResultado && (
                <div className={`p-3 rounded-lg border ${testeResultado.valido ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  {testeResultado.valido ? (
                    <div>
                      <p className="text-xs font-semibold text-emerald-800 mb-2">✓ Expressão válida</p>
                      <div className="text-xs text-emerald-700 space-y-1">
                        <p><strong>Indicadores referenciados:</strong> {testeResultado.indicadores_referenciados.join(', ') || 'Nenhum'}</p>
                        <p><strong>Resultado de teste:</strong> {testeResultado.resultado !== null ? testeResultado.resultado.toFixed(2) : 'null'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-red-700">✗ {testeResultado.error}</p>
                  )}
                </div>
              )}
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
