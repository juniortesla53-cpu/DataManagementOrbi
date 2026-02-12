import { useApi } from '../../hooks/useApi';
import { Calculator, Users, TrendingUp, Award, Loader2, AlertCircle } from 'lucide-react';
import GraficoRVMensal from './components/GraficoRVMensal';

export default function RVDashboard() {
  const { data, loading, error } = useApi<any>('/rv/dashboard');

  if (loading) return <div className="flex items-center justify-center min-h-[500px]"><Loader2 className="w-10 h-10 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[500px]"><div className="card p-10 text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="gradient-brand rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
        <h1 className="text-2xl font-bold relative">Nexus RV 💰</h1>
        <p className="text-white/70 text-sm mt-1 relative">Remuneração Variável — Gestão e cálculo automatizado</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Calculator size={20} className="text-nexus-purple" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">{data.indicadores}</p>
            <p className="text-xs text-nexus-muted">Indicadores ativos</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Award size={20} className="text-nexus-blue" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">{data.regras}</p>
            <p className="text-xs text-nexus-muted">Regras ativas</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">{data.totalColaboradores}</p>
            <p className="text-xs text-nexus-muted">Colaboradores (último cálculo)</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">R$ {(data.totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-nexus-muted">Total RV (último cálculo)</p>
          </div>
        </div>
      </div>

      {/* Último período + Top performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-nexus-text mb-3">Último Cálculo</h3>
          {data.ultimoCalculo ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-nexus-muted">Período</span><span className="font-medium text-nexus-text">{data.ultimoCalculo.periodo}</span></div>
              <div className="flex justify-between"><span className="text-nexus-muted">Data</span><span className="font-medium text-nexus-text">{new Date(data.ultimoCalculo.data_calculo).toLocaleString('pt-BR')}</span></div>
              <div className="flex justify-between"><span className="text-nexus-muted">Status</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  data.ultimoCalculo.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' :
                  data.ultimoCalculo.status === 'pago' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{data.ultimoCalculo.status}</span>
              </div>
              <div className="flex justify-between"><span className="text-nexus-muted">Calculado por</span><span className="font-medium text-nexus-text">{data.ultimoCalculo.calculado_por || '—'}</span></div>
            </div>
          ) : (
            <p className="text-nexus-muted text-sm">Nenhum cálculo realizado ainda</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-nexus-text mb-3">Top Performers</h3>
          {data.ultimosResultados?.length > 0 ? (
            <div className="space-y-2">
              {data.ultimosResultados.map((r: any, i: number) => (
                <div key={r.matricula} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-nexus-muted'}`}>{i + 1}</span>
                    <span className="text-nexus-text font-medium">{r.nome_colaborador}</span>
                  </div>
                  <span className="font-bold text-nexus-purple">R$ {(r.total_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-nexus-muted text-sm">Calcule um período para ver os resultados</p>
          )}
        </div>
      </div>

      {/* Gráfico de histórico mensal */}
      <GraficoRVMensal />
    </div>
  );
}
