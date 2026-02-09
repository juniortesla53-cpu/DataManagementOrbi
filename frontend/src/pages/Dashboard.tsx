import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import SearchBar from '../components/SearchBar';
import ReportCard from '../components/ReportCard';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: reports, loading, error } = useApi<any[]>('/reports');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const categories = [...new Set((reports || []).map(r => r.categoria).filter(Boolean))];
  const filtered = (reports || []).filter(r =>
    (!search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.descricao?.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || r.categoria === catFilter)
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orbi-accent" />
          <p className="text-orbi-muted text-sm">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-orbi-danger" />
          <h3 className="text-lg font-semibold text-orbi-text">Erro ao carregar relatórios</h3>
          <p className="text-orbi-muted text-sm">{error}</p>
          <p className="text-orbi-muted text-xs">Verifique se o servidor está rodando na porta 3001</p>
        </div>
      </div>
    );
  }

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
        <p className="text-center text-orbi-muted py-16">
          {search || catFilter ? 'Nenhum relatório encontrado com os filtros aplicados' : 'Nenhum relatório disponível'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(r => <ReportCard key={r.id} id={r.id} nome={r.nome} descricao={r.descricao} categoria={r.categoria} />)}
        </div>
      )}
    </div>
  );
}
