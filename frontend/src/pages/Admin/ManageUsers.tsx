import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../../api';
import SearchBar from '../../components/SearchBar';

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ matricula: '', login_rede: '', nome_completo: '', cargo: '', cpf: '', site: '', senha: '', role: 'user' });

  const load = () => api.get('/admin/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => u.nome_completo.toLowerCase().includes(search.toLowerCase()) || u.login_rede.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ matricula: '', login_rede: '', nome_completo: '', cargo: '', cpf: '', site: '', senha: '', role: 'user' }); setModal('new'); };
  const openEdit = (u: any) => { setForm({ ...u, senha: '' }); setModal(u.id); };

  const save = async () => {
    if (modal === 'new') await api.post('/admin/users', form);
    else await api.put(`/admin/users/${modal}`, form);
    setModal(null); load();
  };

  const remove = async (id: number) => { if (confirm('Desativar este usuário?')) { await api.delete(`/admin/users/${id}`); load(); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Gerenciar Usuários</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-orbi-accent hover:bg-blue-600 rounded-lg text-xs font-medium transition-colors"><Plus size={14} /> Novo Usuário</button>
      </div>
      <div className="mb-4 max-w-xs"><SearchBar value={search} onChange={setSearch} placeholder="Buscar usuários..." /></div>
      <div className="bg-orbi-card border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700/50 text-orbi-muted text-xs">
            <th className="text-left p-3">Nome</th><th className="text-left p-3">Login</th><th className="text-left p-3">Matrícula</th><th className="text-left p-3">Cargo</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="p-3">{u.nome_completo}</td>
                <td className="p-3 text-orbi-muted">{u.login_rede}</td>
                <td className="p-3 text-orbi-muted">{u.matricula || '-'}</td>
                <td className="p-3 text-orbi-muted">{u.cargo || '-'}</td>
                <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-orbi-accent/20 text-orbi-accent' : 'bg-slate-500/20 text-slate-400'}`}>{u.role}</span></td>
                <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${u.ativo ? 'bg-orbi-success/20 text-orbi-success' : 'bg-orbi-danger/20 text-orbi-danger'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td className="p-3 text-right">
                  <button onClick={() => openEdit(u)} className="p-1 text-orbi-muted hover:text-orbi-accent"><Edit2 size={14} /></button>
                  <button onClick={() => remove(u.id)} className="p-1 text-orbi-muted hover:text-orbi-danger ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-orbi-card border border-slate-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">{modal === 'new' ? 'Novo Usuário' : 'Editar Usuário'}</h2>
              <button onClick={() => setModal(null)} className="text-orbi-muted hover:text-orbi-text"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['nome_completo', 'login_rede', 'matricula', 'cargo', 'cpf', 'site', 'senha'] as const).map(f => (
                <div key={f} className={f === 'nome_completo' ? 'col-span-2' : ''}>
                  <label className="block text-[10px] text-orbi-muted mb-1">{f.replace('_', ' ').toUpperCase()}{f === 'senha' && modal !== 'new' ? ' (vazio = manter)' : ''}</label>
                  <input type={f === 'senha' ? 'password' : 'text'} value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})}
                    className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent" />
                </div>
              ))}
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1">ROLE</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent">
                  <option value="user">Usuário</option><option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button onClick={save} className="mt-4 w-full py-2 bg-orbi-accent hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}
