import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';
import SearchBar from '../../components/SearchBar';

export default function ManageUsers() {
  const { data: users, loading, error, refetch } = useApi<any[]>('/admin/users');
  const { showSuccess, showError } = useToast();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ matricula: '', login_rede: '', nome_completo: '', cargo: '', cpf: '', site: '', senha: '', role: 'user' });
  const [saving, setSaving] = useState(false);

  const filtered = (users || []).filter(u =>
    u.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
    u.login_rede.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm({ matricula: '', login_rede: '', nome_completo: '', cargo: '', cpf: '', site: '', senha: '', role: 'user' }); setModal('new'); };
  const openEdit = (u: any) => { setForm({ ...u, senha: '' }); setModal(u.id); };

  const save = async () => {
    if (!form.nome_completo || !form.login_rede) { showError('Nome e login são obrigatórios'); return; }
    if (modal === 'new' && !form.senha) { showError('Senha é obrigatória'); return; }
    setSaving(true);
    try {
      if (modal === 'new') { await api.post('/admin/users', form); showSuccess('Usuário criado'); }
      else { await api.put(`/admin/users/${modal}`, form); showSuccess('Usuário atualizado'); }
      setModal(null); refetch();
    } catch (err: any) { showError(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Desativar este usuário?')) return;
    try { await api.delete(`/admin/users/${id}`); showSuccess('Usuário desativado'); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-nexus-text">Usuários</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold"><Plus size={14} /> Novo</button>
      </div>

      <div className="max-w-xs"><SearchBar value={search} onChange={setSearch} placeholder="Buscar usuários..." /></div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexus-border bg-nexus-bg text-nexus-muted text-xs">
              <th className="text-left p-3 font-semibold">Nome</th>
              <th className="text-left p-3 font-semibold">Login</th>
              <th className="text-left p-3 font-semibold">Cargo</th>
              <th className="text-left p-3 font-semibold">Role</th>
              <th className="text-left p-3 font-semibold">Status</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-nexus-borderLight hover:bg-nexus-bg/50 transition-colors">
                <td className="p-3 font-medium text-nexus-text">{u.nome_completo}</td>
                <td className="p-3 text-nexus-textSecondary">{u.login_rede}</td>
                <td className="p-3 text-nexus-textSecondary">{u.cargo || '—'}</td>
                <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td className="p-3 text-right space-x-1">
                  <button onClick={() => openEdit(u)} className="p-1 text-nexus-muted hover:text-nexus-purple transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => remove(u.id)} className="p-1 text-nexus-muted hover:text-nexus-danger transition-colors"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-nexus-text">{modal === 'new' ? 'Novo Usuário' : 'Editar Usuário'}</h2>
              <button onClick={() => setModal(null)} className="text-nexus-muted hover:text-nexus-text"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['nome_completo', 'login_rede', 'matricula', 'cargo', 'cpf', 'site', 'senha'] as const).map(f => (
                <div key={f} className={f === 'nome_completo' ? 'col-span-2' : ''}>
                  <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">
                    {f.replace('_', ' ')}{f === 'senha' && modal !== 'new' ? ' (vazio = manter)' : ''}
                  </label>
                  <input type={f === 'senha' ? 'password' : 'text'} value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})}
                    className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" />
                </div>
              ))}
              <div>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs">
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
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
