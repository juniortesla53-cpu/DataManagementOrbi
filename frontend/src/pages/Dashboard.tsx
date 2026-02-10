import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from '../components/SearchBar';
import ReportCard from '../components/ReportCard';
import { AlertCircle, Loader2, BarChart3, FolderOpen, FileBarChart } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: reports, loading, error } = useApi<any[]>('/reports');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const categories = useMemo(() =>
    [...new Set((reports || []).map(r => r.categoria).filter(Boolean))],
    [reports]
  );

  const filtered = useMemo(() =>
    (reports || []).filter(r =>
      (!search || r.nome.toLowerCase().includes(search.toLowerCase()) || r.descricao?.toLowerCase().includes(search.toLowerCase())) &&
      (!catFilter || r.categoria === catFilter)
    ),
    [reports, search, catFilter]
  );

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 animate-fadeIn">
          <Loader2 className="w-10 h-10 animate-spin text-orbi-purple" />
          <p className="text-orbi-muted text-sm">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="card p-10 text-center max-w-md animate-scaleIn">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-orbi-danger" />
          </div>
          <h3 className="text-lg font-bold text-orbi-text mb-2">Erro ao carregar</h3>
          <p className="text-orbi-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="gradient-brand rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
        <h1 className="text-2xl font-bold relative">{getGreeting()}, {user?.nome?.split(' ')[0]}! 👋</h1>
        <p className="text-white/70 text-sm mt-1 relative">Plataforma de gestão de relatórios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={20} className="text-orbi-purple" />
          </div>
          <div>
            <p className="text-xl font-bold text-orbi-text">{reports?.length || 0}</p>
            <p className="text-xs text-orbi-muted">Relatórios</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={20} className="text-orbi-blue" />
          </div>
          <div>
            <p className="text-xl font-bold text-orbi-text">{categories.length}</p>
            <p className="text-xs text-orbi-muted">Categorias</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <FileBarChart size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-orbi-text">{filtered.length}</p>
            <p className="text-xs text-orbi-muted">Visíveis</p>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} /></div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-orbi-border rounded-xl text-sm transition-all"
        >
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <FileBarChart className="w-8 h-8 text-orbi-purple" />
          </div>
          <h3 className="text-base font-semibold text-orbi-text mb-1">
            {search || catFilter ? 'Nenhum relatório encontrado' : 'Nenhum relatório disponível'}
          </h3>
          <p className="text-sm text-orbi-muted">
            {search || catFilter ? 'Tente ajustar os filtros' : 'Relatórios aparecerão aqui quando adicionados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((r, i) => (
            <div key={r.id} className="card-stagger" style={{ animationDelay: `${i * 0.05}s` }}>
              <ReportCard id={r.id} nome={r.nome} descricao={r.descricao} categoria={r.categoria} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
