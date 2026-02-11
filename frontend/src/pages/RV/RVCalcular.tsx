import { useState } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle, Trash2, ChevronDown } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';

export default function RVCalcular() {
  const { data: calculos, loading, error, refetch } = useApi<any[]>('/rv/calculos');
  const { data: periodos } = useApi<any[]>('/rv/periodos');
  const { showSuccess, showError } = useToast();
  const [periodo, setPeriodo] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const calcular = async () => {
    if (!periodo) { showError('Selecione um período'); return; }
    setCalculando(true);
    setResultado(null);
    try {
      const { data } = await api.post('/rv/calcular', { periodo });
      setResultado(data);
      showSuccess(`Cálculo concluído! ${data.totalColaboradores} colaboradores, R$ ${data.totalRV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      refetch();
    } catch (err: any) { showError(err.response?.data?.error || 'Erro ao calcular'); }
    finally { setCalculando(false); }
  };

  const mudarStatus = async (id: number, status: string) => {
    try { await api.put(`/rv/calculos/${id}/status`, { status }); showSuccess(`Status alterado para ${status}`); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este cálculo e todos os resultados?')) return;
    try { await api.delete(`/rv/calculos/${id}`); showSuccess('Cálculo excluído'); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  const verDetalhes = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    try {
      const { data } = await api.get(`/rv/calculos/${id}`);
      setResultado(data);
      setExpanded(id);
    } catch { showError('Erro ao carregar detalhes'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  // Agrupar resultados por colaborador
  const agrupadoPorColab = resultado?.resultados?.reduce((acc: any, r: any) => {
    const key = r.matricula;
    if (!acc[key]) acc[key] = { matricula: r.matricula, nome: r.nome_colaborador, regras: [], total: 0 };
    acc[key].regras.push(r);
    acc[key].total += r.valor_rv;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-lg font-bold text-nexus-text">Calcular RV</h1>
        <p className="text-xs text-nexus-muted">Execute o cálculo da remuneração variável para um período</p>
      </div>

      {/* Seletor de período + botão */}
      <div className="card p-5">
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">Período</label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full px-3 py-2.5 bg-nexus-bg border border-nexus-border rounded-lg text-sm">
              <option value="">Selecione o período...</option>
              {(periodos || []).map((p: any) => <option key={p.periodo} value={p.periodo}>{p.periodo}</option>)}
            </select>
          </div>
          <button onClick={calcular} disabled={calculando || !periodo} className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50">
            {calculando ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {calculando ? 'Calculando...' : 'Calcular RV'}
          </button>
        </div>
      </div>

      {/* Resultado do último cálculo executado */}
      {resultado?.resultados && expanded === null && (
        <div className="card p-5 animate-fadeIn">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-nexus-text">Resultado — {resultado.periodo}</h3>
            <span className="text-xs text-nexus-muted ml-auto">{resultado.totalColaboradores} colaboradores · {resultado.totalRegras} regras</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexus-border bg-nexus-bg text-nexus-muted text-xs">
                  <th className="text-left p-2 font-semibold">Colaborador</th>
                  <th className="text-left p-2 font-semibold">Regra</th>
                  <th className="text-right p-2 font-semibold">Indicador</th>
                  <th className="text-right p-2 font-semibold">Valor RV</th>
                </tr>
              </thead>
              <tbody>
                {resultado.resultados.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-nexus-borderLight hover:bg-nexus-bg/50">
                    <td className="p-2 font-medium text-nexus-text">{r.nome_colaborador || r.nomeColab}</td>
                    <td className="p-2 text-nexus-textSecondary">{r.regra_nome || r.regra}</td>
                    <td className="p-2 text-right text-nexus-textSecondary">{r.valor_indicador != null ? `${r.valor_indicador}%` : '—'}</td>
                    <td className={`p-2 text-right font-bold ${r.valor_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>R$ {(r.valor_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-nexus-bg font-bold">
                  <td colSpan={3} className="p-2 text-nexus-text">Total</td>
                  <td className="p-2 text-right text-nexus-purple">R$ {(resultado.totalRV || resultado.resultados?.reduce((s: number, r: any) => s + (r.valor_rv || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Histórico de cálculos */}
      <div>
        <h3 className="text-sm font-semibold text-nexus-text mb-3">Histórico de Cálculos</h3>
        <div className="space-y-2">
          {(calculos || []).map(c => (
            <div key={c.id} className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-nexus-bg/50 transition-colors" onClick={() => verDetalhes(c.id)}>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    c.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'pago' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{c.status}</span>
                  <div>
                    <p className="font-semibold text-sm text-nexus-text">Período {c.periodo}</p>
                    <p className="text-[11px] text-nexus-muted">{new Date(c.data_calculo).toLocaleString('pt-BR')} · {c.total_colaboradores} colaboradores</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-nexus-purple">R$ {(c.total_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  {c.status === 'rascunho' && <button onClick={e => { e.stopPropagation(); mudarStatus(c.id, 'aprovado'); }} className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold hover:bg-emerald-200">Aprovar</button>}
                  {c.status === 'aprovado' && <button onClick={e => { e.stopPropagation(); mudarStatus(c.id, 'pago'); }} className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold hover:bg-blue-200">Marcar Pago</button>}
                  <button onClick={e => { e.stopPropagation(); excluir(c.id); }} className="p-1 text-nexus-muted hover:text-nexus-danger"><Trash2 size={14} /></button>
                  <ChevronDown size={16} className={`text-nexus-muted transition-transform ${expanded === c.id ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {expanded === c.id && resultado?.resultados && (
                <div className="px-4 pb-4 border-t border-nexus-border pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-nexus-muted">
                        <th className="text-left p-1.5 font-semibold">Colaborador</th>
                        <th className="text-left p-1.5 font-semibold">Regra</th>
                        <th className="text-right p-1.5 font-semibold">Indicador</th>
                        <th className="text-right p-1.5 font-semibold">Valor RV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.resultados.map((r: any, i: number) => (
                        <tr key={i} className="border-t border-nexus-borderLight">
                          <td className="p-1.5 font-medium text-nexus-text">{r.nome_colaborador}</td>
                          <td className="p-1.5 text-nexus-textSecondary">{r.regra_nome}</td>
                          <td className="p-1.5 text-right">{r.valor_indicador != null ? `${r.valor_indicador}%` : '—'}</td>
                          <td className={`p-1.5 text-right font-bold ${r.valor_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>R$ {(r.valor_rv || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {(!calculos || calculos.length === 0) && <p className="text-nexus-muted text-sm text-center py-8">Nenhum cálculo realizado ainda</p>}
        </div>
      </div>
    </div>
  );
}
