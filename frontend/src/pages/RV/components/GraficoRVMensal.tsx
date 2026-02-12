import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../../api';

export default function GraficoRVMensal() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: historico } = await api.get('/rv/dashboard/historico-mensal');
        setData(historico);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Formatar período (2025-07 → Jul/25)
  const formatPeriodo = (periodo: string) => {
    const [ano, mes] = periodo.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
  };

  const chartData = data.map(d => ({
    periodo: formatPeriodo(d.periodo),
    total_rv: d.total_rv,
    total_colaboradores: d.total_colaboradores,
    total_calculos: d.total_calculos,
    periodoOriginal: d.periodo
  }));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-nexus-border rounded-lg shadow-lg p-3">
        <p className="text-xs font-bold text-nexus-purple mb-2">{data.periodo}</p>
        <div className="space-y-1 text-[11px]">
          <p className="text-nexus-text">
            <span className="font-semibold">Total RV:</span>{' '}
            <span className="text-emerald-600 font-bold">
              R$ {data.total_rv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </p>
          <p className="text-nexus-textSecondary">
            <span className="font-semibold">Colaboradores:</span> {data.total_colaboradores}
          </p>
          <p className="text-nexus-textSecondary">
            <span className="font-semibold">Cálculos:</span> {data.total_calculos}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-nexus-purple" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-center py-8 text-center">
          <div>
            <AlertCircle size={28} className="text-nexus-danger mx-auto mb-2" />
            <p className="text-sm text-nexus-text font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
            <TrendingUp size={16} className="text-nexus-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-nexus-text">RV Paga — Histórico Mensal</h3>
            <p className="text-[10px] text-nexus-muted">Evolução da remuneração variável ao longo do tempo</p>
          </div>
        </div>
        <div className="py-8 text-center">
          <p className="text-sm text-nexus-muted">Nenhum histórico disponível ainda.</p>
          <p className="text-xs text-nexus-mutedLight mt-1">Complete alguns cálculos para visualizar o gráfico.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
            <TrendingUp size={16} className="text-nexus-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-nexus-text">RV Paga — Histórico Mensal</h3>
            <p className="text-[10px] text-nexus-muted">Evolução da remuneração variável ao longo do tempo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-600">
            R$ {data.reduce((sum, d) => sum + d.total_rv, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-nexus-muted">Total acumulado</p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="periodo"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total_rv"
              stroke="url(#purpleBlueGradient)"
              strokeWidth={2}
              fill="url(#colorRV)"
              name="Total RV"
            />
            <defs>
              <linearGradient id="purpleBlueGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda com métricas */}
      <div className="mt-4 pt-4 border-t border-nexus-border grid grid-cols-3 gap-3">
        <div className="bg-nexus-bg rounded-lg p-3 text-center">
          <p className="text-sm font-bold text-nexus-text">{data.length}</p>
          <p className="text-[10px] text-nexus-muted">Períodos</p>
        </div>
        <div className="bg-nexus-bg rounded-lg p-3 text-center">
          <p className="text-sm font-bold text-nexus-text">
            {Math.round(data.reduce((sum, d) => sum + d.total_colaboradores, 0) / data.length)}
          </p>
          <p className="text-[10px] text-nexus-muted">Média colab./mês</p>
        </div>
        <div className="bg-nexus-bg rounded-lg p-3 text-center">
          <p className="text-sm font-bold text-nexus-text">
            R$ {(data.reduce((sum, d) => sum + d.total_rv, 0) / data.length).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-nexus-muted">Média RV/mês</p>
        </div>
      </div>
    </div>
  );
}
