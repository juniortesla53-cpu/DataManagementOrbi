import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../../api';

export default function ManagePermissions() {
  const [perms, setPerms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [selUser, setSelUser] = useState('');
  const [selReport, setSelReport] = useState('');

  const load = () => {
    api.get('/admin/permissions').then(r => setPerms(r.data));
    api.get('/admin/users').then(r => setUsers(r.data.filter((u:any) => u.ativo)));
    api.get('/admin/reports').then(r => setReports(r.data.filter((r:any) => r.ativo)));
  };
  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!selUser || !selReport) return;
    await api.post('/admin/permissions', { user_id: parseInt(selUser), report_id: parseInt(selReport) });
    setModal(false); load();
  };

  const revoke = async (id: number) => { await api.delete(`/admin/permissions/${id}`); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Gerenciar Permissões</h1>
        <button onClick={() => { setSelUser(''); setSelReport(''); setModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-orbi-accent hover:bg-blue-600 rounded-lg text-xs font-medium transition-colors"><Plus size={14} /> Nova Permissão</button>
      </div>
      <div className="bg-orbi-card border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700/50 text-orbi-muted text-xs">
            <th className="text-left p-3">Usuário</th><th className="text-left p-3">Login</th><th className="text-left p-3">Relatório</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {perms.map(p => (
              <tr key={p.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="p-3">{p.user_nome}</td>
                <td className="p-3 text-orbi-muted">{p.login_rede}</td>
                <td className="p-3">{p.report_nome}</td>
                <td className="p-3 text-right">
                  <button onClick={() => revoke(p.id)} className="p-1 text-orbi-muted hover:text-orbi-danger"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {perms.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-orbi-muted">Nenhuma permissão cadastrada</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-orbi-card border border-slate-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Nova Permissão</h2>
              <button onClick={() => setModal(false)} className="text-orbi-muted hover:text-orbi-text"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1">USUÁRIO</label>
                <select value={selUser} onChange={e => setSelUser(e.target.value)}
                  className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent">
                  <option value="">Selecione...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.nome_completo} ({u.login_rede})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1">RELATÓRIO</label>
                <select value={selReport} onChange={e => setSelReport(e.target.value)}
                  className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent">
                  <option value="">Selecione...</option>
                  {reports.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
            </div>
            <button onClick={grant} className="mt-4 w-full py-2 bg-orbi-accent hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">Conceder Acesso</button>
          </div>
        </div>
      )}
    </div>
  );
}
