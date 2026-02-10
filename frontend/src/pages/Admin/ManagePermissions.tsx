import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';

export default function ManagePermissions() {
  const { data: perms, loading, error, refetch } = useApi<any[]>('/admin/permissions');
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [modal, setModal] = useState(false);
  const [selUser, setSelUser] = useState('');
  const [selReport, setSelReport] = useState('');
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/admin/users'), api.get('/admin/reports')]).then(([u, r]) => {
      setUsers(u.data.filter((x: any) => x.ativo));
      setReports(r.data.filter((x: any) => x.ativo));
    }).catch(() => showError('Erro ao carregar listas')).finally(() => setLoadingLists(false));
  }, []);

  const grant = async () => {
    if (!selUser || !selReport) { showError('Selecione usuário e relatório'); return; }
    setGranting(true);
    try { await api.post('/admin/permissions', { user_id: parseInt(selUser), report_id: parseInt(selReport) }); showSuccess('Permissão concedida'); setModal(false); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
    finally { setGranting(false); }
  };

  const revoke = async (id: number) => {
    if (!confirm('Revogar?')) return;
    try { await api.delete(`/admin/permissions/${id}`); showSuccess('Revogada'); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  if (loading || loadingLists) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-orbi-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-orbi-danger mx-auto mb-2" /><p className="text-orbi-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-orbi-text">Permissões</h1>
        <button onClick={() => { setSelUser(''); setSelReport(''); setModal(true); }} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-xs font-semibold"><Plus size={14} /> Nova</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orbi-border bg-orbi-bg text-orbi-muted text-xs">
              <th className="text-left p-3 font-semibold">Usuário</th>
              <th className="text-left p-3 font-semibold">Login</th>
              <th className="text-left p-3 font-semibold">Relatório</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {(perms || []).map(p => (
              <tr key={p.id} className="border-b border-orbi-borderLight hover:bg-orbi-bg/50 transition-colors">
                <td className="p-3 font-medium text-orbi-text">{p.user_nome}</td>
                <td className="p-3 text-orbi-textSecondary">{p.login_rede}</td>
                <td className="p-3 text-orbi-text">{p.report_nome}</td>
                <td className="p-3 text-right"><button onClick={() => revoke(p.id)} className="p-1 text-orbi-muted hover:text-orbi-danger transition-colors"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {(!perms || perms.length === 0) && <tr><td colSpan={4} className="p-8 text-center text-orbi-muted">Nenhuma permissão cadastrada</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-orbi-text">Nova Permissão</h2>
              <button onClick={() => setModal(false)} className="text-orbi-muted hover:text-orbi-text"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1 font-semibold uppercase">Usuário</label>
                <select value={selUser} onChange={e => setSelUser(e.target.value)} className="w-full px-3 py-2 bg-orbi-bg border border-orbi-border rounded-lg text-xs">
                  <option value="">Selecione...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1 font-semibold uppercase">Relatório</label>
                <select value={selReport} onChange={e => setSelReport(e.target.value)} className="w-full px-3 py-2 bg-orbi-bg border border-orbi-border rounded-lg text-xs">
                  <option value="">Selecione...</option>
                  {reports.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
            </div>
            <button onClick={grant} disabled={granting} className="mt-5 w-full py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {granting && <Loader2 size={14} className="animate-spin" />}{granting ? 'Concedendo...' : 'Conceder Acesso'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
