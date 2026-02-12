import React, { useState, useEffect } from 'react';
import { BarChart3, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle, XCircle, Users, DollarSign, Award } from 'lucide-react';
import api from '../../../api';
import ExportButton from './ExportButton';

interface Props {
  periodo: string;
  regrasSelecionadas: number[];
  simulacao: any;
  setSimulacao: (s: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepSimulacao({ periodo, regrasSelecionadas, simulacao, setSimulacao, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executarSimulacao = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/rv/simular', { periodo, regraIds: regrasSelecionadas });
      setSimulacao(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao executar simulação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!simulacao) {
      executarSimulacao();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 animate-ping opacity-20" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-nexus-text">Executando simulação...</p>
          <p className="text-xs text-nexus-muted mt-1">Calculando RV para {periodo}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="card p-8 text-center">
          <AlertCircle size={32} className="text-nexus-danger mx-auto mb-3" />
          <p className="text-sm text-nexus-text font-medium">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={onBack} className="text-sm text-nexus-muted hover:text-nexus-text">← Voltar</button>
            <button onClick={executarSimulacao} className="text-sm text-nexus-purple font-medium hover:underline">Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  if (!simulacao) return null;

  const { colaboradores, totalRV, totalColaboradores, totalRegras, regrasUsadas } = simulacao;
  const regrasNomes = regrasUsadas || [];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-nexus-purple" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">{totalColaboradores}</p>
            <p className="text-[10px] text-nexus-muted">Colaboradores</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Award size={18} className="text-nexus-blue" />
          </div>
          <div>
            <p className="text-xl font-bold text-nexus-text">{totalRegras}</p>
            <p className="text-[10px] text-nexus-muted">Regras aplicadas</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-600">
              R$ {(totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-nexus-muted">Total RV simulado</p>
          </div>
        </div>
      </div>

      {/* Tabela de simulação detalhada */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-nexus-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-nexus-purple" />
            <h3 className="text-sm font-semibold text-nexus-text">Simulação Detalhada — {periodo}</h3>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              data={colaboradores.map((c: any) => {
                const row: any = {
                  matricula: c.matricula,
                  nome: c.nome,
                  total_rv: c.total_rv || 0
                };
                regrasNomes.forEach((rn: any) => {
                  const regraResult = c.regras.find((r: any) => r.id_regra === rn.id);
                  row[`${rn.nome}_Indicador`] = regraResult?.indicador_valor ?? '';
                  row[`${rn.nome}_Faixa`] = regraResult?.faixa ? `${regraResult.faixa.min}-${regraResult.faixa.max ?? '∞'}` : '';
                  row[`${rn.nome}_Comissao`] = regraResult?.valor_rv ?? 0;
                  row[`${rn.nome}_CondicoesOK`] = regraResult?.condicoes_ok ? 'Sim' : 'Não';
                });
                return row;
              })}
              columns={[
                { key: 'matricula', label: 'Matrícula' },
                { key: 'nome', label: 'Colaborador' },
                ...regrasNomes.flatMap((rn: any) => [
                  { key: `${rn.nome}_Indicador`, label: `${rn.nome} - Indicador (%)` },
                  { key: `${rn.nome}_Faixa`, label: `${rn.nome} - Faixa` },
                  { key: `${rn.nome}_Comissao`, label: `${rn.nome} - Comissão (R$)` },
                  { key: `${rn.nome}_CondicoesOK`, label: `${rn.nome} - Condições` }
                ]),
                { key: 'total_rv', label: 'Total RV (R$)' }
              ]}
              filename={`rv_simulacao_${periodo}`}
            />
            <button
              onClick={executarSimulacao}
              className="text-xs font-medium text-nexus-purple hover:text-nexus-purpleDark transition-colors"
            >
              ↻ Recalcular
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-nexus-bg border-b border-nexus-border">
                <th className="text-left p-3 font-semibold text-nexus-muted text-xs sticky left-0 bg-nexus-bg z-10 min-w-[180px]">
                  Colaborador
                </th>
                {regrasNomes.map((r: any) => (
                  <th key={r.id} colSpan={3} className="text-center p-2 font-semibold text-xs border-l border-nexus-border">
                    <span className="text-nexus-purple">{r.nome}</span>
                  </th>
                ))}
                <th className="text-right p-3 font-semibold text-xs text-nexus-text border-l-2 border-nexus-border bg-nexus-bg min-w-[120px]">
                  Total RV
                </th>
              </tr>
              <tr className="bg-nexus-bg/50 border-b border-nexus-border text-[10px] text-nexus-muted uppercase tracking-wide">
                <th className="p-2 sticky left-0 bg-nexus-bg/50 z-10"></th>
                {regrasNomes.map((r: any) => (
                  <React.Fragment key={`sub-${r.id}`}>
                    <th className="p-2 text-center border-l border-nexus-borderLight font-semibold">Indicador</th>
                    <th className="p-2 text-center font-semibold">Faixa</th>
                    <th className="p-2 text-right font-semibold">Comissão</th>
                  </React.Fragment>
                ))}
                <th className="p-2 border-l-2 border-nexus-border"></th>
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((colab: any, idx: number) => (
                <tr
                  key={colab.matricula}
                  className={`border-b border-nexus-borderLight hover:bg-purple-50/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-nexus-bg/20'
                  }`}
                >
                  <td className="p-3 sticky left-0 bg-inherit z-10">
                    <p className="font-medium text-nexus-text whitespace-nowrap">{colab.nome}</p>
                    <p className="text-[10px] text-nexus-muted">{colab.matricula}</p>
                  </td>
                  {regrasNomes.map((rn: any) => {
                    const regraResult = colab.regras.find((r: any) => r.id_regra === rn.id);
                    if (!regraResult) {
                      return (
                        <React.Fragment key={`${colab.matricula}-${rn.id}`}>
                          <td className="p-2 text-center border-l border-nexus-borderLight text-nexus-muted">—</td>
                          <td className="p-2 text-center text-nexus-muted">—</td>
                          <td className="p-2 text-right text-nexus-muted">—</td>
                        </React.Fragment>
                      );
                    }

                    const isZero = regraResult.valor_rv === 0;
                    const condFailed = !regraResult.condicoes_ok;

                    return (
                      <React.Fragment key={`${colab.matricula}-${rn.id}`}>
                        {/* Indicador */}
                        <td className="p-2 text-center border-l border-nexus-borderLight">
                          {regraResult.indicador_valor != null ? (
                            <span className="font-medium text-nexus-text">
                              {regraResult.indicador_valor}%
                            </span>
                          ) : (
                            <span className="text-nexus-muted text-xs">—</span>
                          )}
                        </td>
                        {/* Faixa */}
                        <td className="p-2 text-center">
                          {condFailed ? (
                            <div className="flex items-center justify-center gap-1" title="Condição não atendida">
                              <XCircle size={12} className="text-red-400" />
                              <span className="text-[10px] text-red-400">bloqueado</span>
                            </div>
                          ) : regraResult.faixa ? (
                            <span className="text-[10px] px-2 py-0.5 bg-nexus-bg rounded-full text-nexus-textSecondary">
                              {regraResult.faixa.min}–{regraResult.faixa.max ?? '∞'}
                            </span>
                          ) : (
                            <span className="text-nexus-muted text-xs">fora</span>
                          )}
                        </td>
                        {/* Comissão */}
                        <td className={`p-2 text-right font-bold ${
                          condFailed ? 'text-red-300' :
                          isZero ? 'text-nexus-muted' :
                          'text-emerald-600'
                        }`}>
                          {condFailed ? (
                            <span className="text-xs line-through">R$ 0</span>
                          ) : (
                            `R$ ${regraResult.valor_rv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {/* Total */}
                  <td className="p-3 text-right font-bold border-l-2 border-nexus-border">
                    <span className={colab.total_rv > 0 ? 'text-nexus-purple text-base' : 'text-nexus-muted'}>
                      R$ {(colab.total_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-purple-50 to-blue-50 font-bold">
                <td className="p-3 text-nexus-text sticky left-0 bg-gradient-to-r from-purple-50 to-purple-50 z-10">
                  TOTAL GERAL
                </td>
                {regrasNomes.map((rn: any) => {
                  const totalRegra = colaboradores.reduce((sum: number, c: any) => {
                    const r = c.regras.find((r: any) => r.id_regra === rn.id);
                    return sum + (r?.valor_rv || 0);
                  }, 0);
                  return (
                    <React.Fragment key={`total-${rn.id}`}>
                      <td className="p-2 border-l border-nexus-borderLight"></td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right text-nexus-purple">
                        R$ {totalRegra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="p-3 text-right text-lg text-nexus-purple border-l-2 border-nexus-border">
                  R$ {(totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-nexus-muted px-1">
        <div className="flex items-center gap-1">
          <CheckCircle size={12} className="text-emerald-500" />
          <span>Condição atendida</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle size={12} className="text-red-400" />
          <span>Condição bloqueada (ex: assiduidade)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
          <span>Com comissão</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-nexus-bg border border-nexus-border inline-block" />
          <span>Sem comissão</span>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-nexus-textSecondary bg-nexus-bg border border-nexus-border hover:border-nexus-muted transition-colors"
        >
          <ChevronLeft size={16} />
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!simulacao}
          className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          Confirmar
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
