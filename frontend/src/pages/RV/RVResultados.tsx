import { useState } from 'react';
import { Download, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

export default function RVResultados() {
  const { data: periodos } = useApi<any[]>('/rv/periodos');
  const { data: resultados, loading, error, refetch } = useApi<any[]>('/rv/resultados');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroMatricula, setFiltroMatricula] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const filtered = (resultados || []).filter(r =>
    (!filtroPeriodo || r.periodo === filtroPeriodo) &&
    (!filtroMatricula || r.nome_colaborador?.toLowerCase().includes(filtroMatricula.toLowerCase()) || r.matricula.toLowerCase().includes(filtroMatricula.toLowerCase()))
  );

  // Agrupar por colaborador+período
  const agrupado: Record<string, { nome: string; matricula: string; periodo: string; total: number; itens: any[] }> = {};
  for (const r of filtered) {
    const key = `${r.periodo}_${r.matricula}`;
    if (!agrupado[key]) agrupado[key] = { nome: r.nome_colaborador, matricula: r.matricula, periodo: r.periodo, total: 0, itens: [] };
    agrupado[key].itens.push(r);
    agrupado[key].total += r.valor_rv;
  }
  const grupos = Object.values(agrupado).sort((a, b) => b.periodo.localeCompare(a.periodo) || b.total - a.total);

  const exportCSV = () => {
    const header = 'Periodo,Matricula,Colaborador,Regra,Indicador %,Valor RV,Status';
    const rows = filtered.map(r => `${r.periodo},${r.matricula},"${r.nome_colaborador}","${r.regra_nome}",${r.valor_indicador ?? ''},${r.valor_rv},${r.calculo_status}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexus-rv-resultados${filtroPeriodo ? '-' + filtroPeriodo : ''}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-nexus-text">Resultados</h1>
          <p className="text-xs text-nexus-muted">Visualize e exporte os resultados de remuneração variável</p>
        </div>
        {filtered.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="px-3 py-2 bg-white border border-nexus-border rounded-xl text-sm">
          <option value="">Todos os períodos</option>
          {(periodos || []).map((p: any) => <option key={p.periodo} value={p.periodo}>{p.periodo}</option>)}
        </select>
        <input type="text" placeholder="Filtrar por nome ou matrícula..." value={filtroMatricula} onChange={e => setFiltroMatricula(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 bg-white border border-nexus-border rounded-xl text-sm placeholder:text-nexus-muted" />
      </div>

      {/* Resultados agrupados */}
      {grupos.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-nexus-muted text-sm">Nenhum resultado encontrado. Execute um cálculo primeiro.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grupos.map((g, gi) => (
            <div key={`${g.periodo}_${g.matricula}`} className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-nexus-bg/50 transition-colors" onClick={() => setExpandedRow(expandedRow === gi ? null : gi)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {g.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-nexus-text">{g.nome}</p>
                    <p className="text-[11px] text-nexus-muted">{g.matricula} · {g.periodo} · {g.itens.length} regras</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-nexus-purple">R$ {g.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  {expandedRow === gi ? <ChevronUp size={16} className="text-nexus-muted" /> : <ChevronDown size={16} className="text-nexus-muted" />}
                </div>
              </div>
              {expandedRow === gi && (
                <div className="px-4 pb-4 border-t border-nexus-border pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-nexus-muted">
                        <th className="text-left p-1.5 font-semibold">Regra</th>
                        <th className="text-right p-1.5 font-semibold">Indicador</th>
                        <th className="text-right p-1.5 font-semibold">Valor RV</th>
                        <th className="text-left p-1.5 font-semibold">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.itens.map((r: any, i: number) => {
                        let detalhes: any = null;
                        try { detalhes = r.detalhes_json ? JSON.parse(r.detalhes_json) : null; } catch {}
                        return (
                          <tr key={i} className="border-t border-nexus-borderLight">
                            <td className="p-1.5 font-medium text-nexus-text">{r.regra_nome}</td>
                            <td className="p-1.5 text-right">{r.valor_indicador != null ? `${r.valor_indicador}%` : '—'}</td>
                            <td className={`p-1.5 text-right font-bold ${r.valor_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>R$ {(r.valor_rv || 0).toFixed(2)}</td>
                            <td className="p-1.5 text-nexus-muted">
                              {detalhes?.motivo && <span className="text-amber-600">{detalhes.motivo}</span>}
                              {detalhes?.faixa_encontrada && <span>Faixa {detalhes.faixa_encontrada.min}%-{detalhes.faixa_encontrada.max}%</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-nexus-border font-bold">
                        <td className="p-1.5">Total</td>
                        <td></td>
                        <td className="p-1.5 text-right text-nexus-purple">R$ {g.total.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
