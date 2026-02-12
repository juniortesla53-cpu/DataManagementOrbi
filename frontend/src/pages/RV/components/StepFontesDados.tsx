import { useState, useEffect } from 'react';
import { Database, Calendar, ChevronRight, ChevronLeft, Loader2, Search, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import api from '../../../api';
import ExportButton from './ExportButton';

interface Props {
  periodo: string;
  setPeriodo: (p: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepFontesDados({ periodo, setPeriodo, onNext, onBack }: Props) {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  // Carregar períodos disponíveis
  useEffect(() => {
    api.get('/rv/periodos')
      .then(r => setPeriodos(r.data))
      .finally(() => setLoadingPeriodos(false));
  }, []);

  // Quando período muda, buscar dados
  useEffect(() => {
    if (!periodo) { setData(null); return; }
    setLoading(true);
    setError(null);
    api.get(`/rv/colaboradores-periodo?periodo=${periodo}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [periodo]);

  const colaboradores = data?.colaboradores || [];
  const indicadoresVisiveis = (data?.indicadores || []).filter((i: any) => !i.codigo.startsWith('META_'));

  const colabsFiltrados = colaboradores.filter((c: any) =>
    c.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    c.matricula.toLowerCase().includes(filtro.toLowerCase())
  );

  const colabsComStatus = colabsFiltrados.map((c: any) => {
    const indCodigos = c.indicadores.map((i: any) => i.codigo);
    const faltantes = indicadoresVisiveis.filter((iv: any) => !indCodigos.includes(iv.codigo));
    return { ...c, faltantes, completo: faltantes.length === 0 };
  });

  const totalCompletos = colabsComStatus.filter((c: any) => c.completo).length;
  const canProceed = periodo && colaboradores.length > 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Seleção de Período */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Calendar size={16} className="text-nexus-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-nexus-text">Período de Cálculo</h3>
            <p className="text-[10px] text-nexus-muted">Selecione o mês/ano para calcular a remuneração variável</p>
          </div>
        </div>

        {loadingPeriodos ? (
          <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-nexus-purple" /></div>
        ) : periodos.length === 0 ? (
          <p className="text-sm text-nexus-muted text-center py-4">Nenhum período com dados disponível. Importe dados de indicadores primeiro.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {periodos.map(p => (
              <button
                key={p.periodo}
                onClick={() => setPeriodo(p.periodo)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                  periodo === p.periodo
                    ? 'bg-gradient-to-br from-purple-600 to-blue-500 text-white border-transparent shadow-md shadow-purple-500/20'
                    : 'bg-nexus-bg border-nexus-border text-nexus-textSecondary hover:border-nexus-purple hover:text-nexus-purple'
                }`}
              >
                {p.periodo}
              </button>
            ))}
          </div>
        )}

        {/* Resumo do período */}
        {periodo && !loading && data && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-nexus-bg rounded-lg">
            <Users size={16} className="text-nexus-muted" />
            <span className="text-sm text-nexus-textSecondary">
              <span className="font-bold text-nexus-text">{colaboradores.length}</span> colaboradores com dados em <span className="font-semibold text-nexus-purple">{periodo}</span>
            </span>
          </div>
        )}
      </div>

      {/* Tabela de dados */}
      {periodo && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 size={28} className="animate-spin text-nexus-purple mx-auto mb-2" />
                <p className="text-sm text-nexus-muted">Carregando fontes de dados...</p>
              </div>
            </div>
          ) : error ? (
            <div className="card p-8 text-center">
              <AlertTriangle size={32} className="text-nexus-warning mx-auto mb-3" />
              <p className="text-sm text-nexus-text font-medium">{error}</p>
            </div>
          ) : (
            <>
              {/* Resumo */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Database size={16} className="text-nexus-blue" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-nexus-text">Fontes de Dados — {periodo}</h3>
                    <p className="text-[10px] text-nexus-muted">Revise os dados dos indicadores antes de prosseguir</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-nexus-bg rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-nexus-text">{colaboradores.length}</p>
                    <p className="text-[10px] text-nexus-muted">Colaboradores</p>
                  </div>
                  <div className="bg-nexus-bg rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-nexus-text">{indicadoresVisiveis.length}</p>
                    <p className="text-[10px] text-nexus-muted">Indicadores</p>
                  </div>
                  <div className="bg-nexus-bg rounded-lg p-3 text-center">
                    <p className={`text-lg font-bold ${totalCompletos === colabsFiltrados.length ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {totalCompletos}/{colabsFiltrados.length}
                    </p>
                    <p className="text-[10px] text-nexus-muted">Dados completos</p>
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-nexus-border flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome ou matrícula..."
                      value={filtro}
                      onChange={e => setFiltro(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-sm"
                    />
                  </div>
                  <ExportButton
                    data={colabsComStatus.map((c: any) => {
                      const row: any = {
                        matricula: c.matricula,
                        nome: c.nome,
                        status: c.completo ? 'Completo' : 'Incompleto'
                      };
                      indicadoresVisiveis.forEach((ind: any) => {
                        const indData = c.indicadores.find((i: any) => i.codigo === ind.codigo);
                        row[ind.codigo] = indData ? indData.valor : '';
                        if (indData?.meta != null) row[`${ind.codigo}_META`] = indData.meta;
                      });
                      return row;
                    })}
                    columns={[
                      { key: 'matricula', label: 'Matrícula' },
                      { key: 'nome', label: 'Colaborador' },
                      { key: 'status', label: 'Status' },
                      ...indicadoresVisiveis.flatMap((ind: any) => {
                        const cols = [{ key: ind.codigo, label: ind.nome }];
                        // Adicionar coluna de meta se houver
                        const temMeta = colabsComStatus.some((c: any) => 
                          c.indicadores.find((i: any) => i.codigo === ind.codigo && i.meta != null)
                        );
                        if (temMeta) cols.push({ key: `${ind.codigo}_META`, label: `${ind.nome} (Meta)` });
                        return cols;
                      })
                    ]}
                    filename={`rv_dados_${periodo}`}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-nexus-bg border-b border-nexus-border">
                        <th className="text-left p-3 font-semibold text-nexus-muted text-xs sticky left-0 bg-nexus-bg z-10">Status</th>
                        <th className="text-left p-3 font-semibold text-nexus-muted text-xs sticky left-[60px] bg-nexus-bg z-10">Colaborador</th>
                        {indicadoresVisiveis.map((ind: any) => (
                          <th key={ind.codigo} className="text-right p-3 font-semibold text-nexus-muted text-xs whitespace-nowrap">
                            {ind.nome}
                            <span className="block text-[9px] font-normal text-nexus-mutedLight">{ind.unidade}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {colabsComStatus.map((colab: any) => (
                        <tr key={colab.matricula} className="border-b border-nexus-borderLight hover:bg-nexus-bg/50 transition-colors">
                          <td className="p-3 sticky left-0 bg-white z-10">
                            {colab.completo ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                          </td>
                          <td className="p-3 sticky left-[60px] bg-white z-10">
                            <p className="font-medium text-nexus-text whitespace-nowrap">{colab.nome}</p>
                            <p className="text-[10px] text-nexus-muted">{colab.matricula}</p>
                          </td>
                          {indicadoresVisiveis.map((ind: any) => {
                            const indData = colab.indicadores.find((i: any) => i.codigo === ind.codigo);
                            const hasMeta = indData?.meta != null;
                            return (
                              <td key={ind.codigo} className={`p-3 text-right whitespace-nowrap ${!indData ? 'bg-red-50' : ''}`}>
                                {indData ? (
                                  <div>
                                    <span className="font-medium text-nexus-text">
                                      {indData.tipo === 'percentual' ? `${indData.valor}%` : indData.valor.toLocaleString('pt-BR')}
                                    </span>
                                    {hasMeta && (
                                      <span className="block text-[9px] text-nexus-muted">meta: {indData.meta.toLocaleString('pt-BR')}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-red-400 italic">sem dados</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {colabsComStatus.length === 0 && (
                        <tr>
                          <td colSpan={indicadoresVisiveis.length + 2} className="p-8 text-center text-nexus-muted text-sm">
                            {filtro ? 'Nenhum colaborador encontrado' : 'Nenhum dado disponível para este período'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Navegação */}
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-nexus-textSecondary bg-nexus-bg border border-nexus-border hover:border-nexus-muted transition-colors">
          <ChevronLeft size={16} /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
        >
          Próximo <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
