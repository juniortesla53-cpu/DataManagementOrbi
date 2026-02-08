import { useState, useEffect } from 'react';
import api from '../api';
import SearchBar from '../components/SearchBar';
import ReportCard from '../components/ReportCard';

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  useEffect(() => {
    api.get('/reports').then(r => setReports(r.data));
  }, []);

  const categories = [...new Set(reports.map(r => r.categoria).filter(Boolean))];
  const filtered = reports.filter(r =>
    (!search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.descricao?.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || r.categoria === catFilter)
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} /></div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 bg-orbi-card border border-slate-700 rounded-lg text-sm text-orbi-text focus:outline-none focus:border-orbi-accent">
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-orbi-muted py-16">Nenhum relatório encontrado</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(r => <ReportCard key={r.id} id={r.id} nome={r.nome} descricao={r.descricao} categoria={r.categoria} />)}
        </div>
      )}
    </div>
  );
}
