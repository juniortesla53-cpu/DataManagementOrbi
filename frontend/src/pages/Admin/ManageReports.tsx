import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../../api';
import SearchBar from '../../components/SearchBar';

export default function ManageReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: '', link_powerbi: '', thumbnail_url: '' });

  const load = () => api.get('/admin/reports').then(r => setReports(r.data));
  useEffect(() => { load(); }, []);

  const filtered = reports.filter(r => r.nome.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ nome: '', descricao: '', categoria: '', link_powerbi: '', thumbnail_url: '' }); setModal('new'); };
  const openEdit = (r: any) => { setForm(r); setModal(r.id); };

  const save = async () => {
    if (modal === 'new') await api.post('/admin/reports', form);
    else await api.put(`/admin/reports/${modal}`, form);
    setModal(null); load();
  };

  const remove = async (id: number) => { if (confirm('Desativar este relatório?')) { await api.delete(`/admin/reports/${id}`); load(); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Gerenciar Relatórios</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-3 py-1.5 bg-orbi-accent hover:bg-blue-600 rounded-lg text-xs font-medium transition-colors"><Plus size={14} /> Novo Relatório</button>
      </div>
      <div className="mb-4 max-w-xs"><SearchBar value={search} onChange={setSearch} placeholder="Buscar relatórios..." /></div>
      <div className="bg-orbi-card border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700/50 text-orbi-muted text-xs">
            <th className="text-left p-3">Nome</th><th className="text-left p-3">Categoria</th><th className="text-left p-3">Status</th><th className="text-left p-3">Link</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="p-3">{r.nome}</td>
                <td className="p-3 text-orbi-muted">{r.categoria || '-'}</td>
                <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${r.ativo ? 'bg-orbi-success/20 text-orbi-success' : 'bg-orbi-danger/20 text-orbi-danger'}`}>{r.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td className="p-3 text-orbi-muted text-xs max-w-[200px] truncate">{r.link_powerbi}</td>
                <td className="p-3 text-right">
                  <button onClick={() => openEdit(r)} className="p-1 text-orbi-muted hover:text-orbi-accent"><Edit2 size={14} /></button>
                  <button onClick={() => remove(r.id)} className="p-1 text-orbi-muted hover:text-orbi-danger ml-1"><Trash2 size={14} /></button>
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
              <h2 className="font-bold">{modal === 'new' ? 'Novo Relatório' : 'Editar Relatório'}</h2>
              <button onClick={() => setModal(null)} className="text-orbi-muted hover:text-orbi-text"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {(['nome', 'descricao', 'categoria', 'link_powerbi'] as const).map(f => (
                <div key={f}>
                  <label className="block text-[10px] text-orbi-muted mb-1">{f === 'link_powerbi' ? 'LINK POWER BI' : f.toUpperCase()}</label>
                  <input type="text" value={(form as any)[f] || ''} onChange={e => setForm({...form, [f]: e.target.value})}
                    className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent" />
                </div>
              ))}
            </div>
            <button onClick={save} className="mt-4 w-full py-2 bg-orbi-accent hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}
