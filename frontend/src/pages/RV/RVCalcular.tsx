import { useState } from 'react';
import { Target, Settings2, Database, BarChart3, CheckCircle, Loader2, ChevronDown, Trash2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';
import Stepper, { type StepConfig } from './components/Stepper';
import StepIndicadores from './components/StepIndicadores';
import StepRegras from './components/StepRegras';
import StepFontesDados from './components/StepFontesDados';
import StepSimulacao from './components/StepSimulacao';
import StepConfirmacao from './components/StepConfirmacao';

const STEPS: StepConfig[] = [
  { id: 'indicadores', label: '1° Indicadores', icon: Target,      description: 'Defina os KPIs' },
  { id: 'regras',      label: '2° Regras',      icon: Settings2,   description: 'Configure as regras' },
  { id: 'fontes',      label: '3° Fonte de Dados', icon: Database,  description: 'Selecione período e dados' },
  { id: 'calculo',     label: '4° Cálculo',     icon: BarChart3,   description: 'Simule o cálculo' },
  { id: 'resultados',  label: '5° Resultados',  icon: CheckCircle, description: 'Confirme e salve' },
];

export default function RVCalcular() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [periodo, setPeriodo] = useState('');
  const [regrasSelecionadas, setRegrasSelecionadas] = useState<number[]>([]);
  const [simulacao, setSimulacao] = useState<any>(null);
  const [showHistorico, setShowHistorico] = useState(false);

  // Histórico
  const { data: calculos, loading: loadingCalc, refetch: refetchCalculos } = useApi<any[]>('/rv/calculos');
  const { showSuccess, showError } = useToast();
  const [expandedCalc, setExpandedCalc] = useState<number | null>(null);
  const [calcDetalhes, setCalcDetalhes] = useState<any>(null);

  const completedSteps = new Set<number>();
  for (let i = 0; i < currentStep; i++) completedSteps.add(i);

  const goToStep = (step: number) => {
    if (step < currentStep) {
      // Se voltar antes do cálculo, limpar simulação
      if (step < 3) setSimulacao(null);
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      if (currentStep <= 3) setSimulacao(null);
      setCurrentStep(currentStep - 1);
    }
  };

  // Histórico funções
  const mudarStatus = async (id: number, status: string) => {
    try { await api.put(`/rv/calculos/${id}/status`, { status }); showSuccess(`Status alterado para ${status}`); refetchCalculos(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este cálculo e todos os resultados?')) return;
    try { await api.delete(`/rv/calculos/${id}`); showSuccess('Cálculo excluído'); refetchCalculos(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); }
  };

  const verDetalhes = async (id: number) => {
    if (expandedCalc === id) { setExpandedCalc(null); return; }
    try {
      const { data } = await api.get(`/rv/calculos/${id}`);
      setCalcDetalhes(data);
      setExpandedCalc(id);
    } catch { showError('Erro ao carregar detalhes'); }
  };

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-nexus-text">Plano de Cálculo RV</h1>
        <p className="text-xs text-nexus-muted">Siga as etapas para configurar e calcular a remuneração variável</p>
      </div>

      {/* Stepper */}
      <div className="card p-5">
        <Stepper
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step content */}
      <div>
        {currentStep === 0 && (
          <StepIndicadores onNext={nextStep} />
        )}
        {currentStep === 1 && (
          <StepRegras
            regrasSelecionadas={regrasSelecionadas}
            setRegrasSelecionadas={setRegrasSelecionadas}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 2 && (
          <StepFontesDados
            periodo={periodo}
            setPeriodo={setPeriodo}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 3 && (
          <StepSimulacao
            periodo={periodo}
            regrasSelecionadas={regrasSelecionadas}
            simulacao={simulacao}
            setSimulacao={setSimulacao}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 4 && (
          <StepConfirmacao
            periodo={periodo}
            regrasSelecionadas={regrasSelecionadas}
            simulacao={simulacao}
            onBack={prevStep}
          />
        )}
      </div>

      {/* Histórico de Cálculos (colapsável) */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowHistorico(!showHistorico)}
          className="w-full flex items-center justify-between p-4 hover:bg-nexus-bg/50 transition-colors"
        >
          <span className="text-sm font-semibold text-nexus-text">Histórico de Cálculos</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-nexus-muted">{calculos?.length || 0} cálculos</span>
            <ChevronDown size={16} className={`text-nexus-muted transition-transform ${showHistorico ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {showHistorico && (
          <div className="border-t border-nexus-border">
            {loadingCalc ? (
              <div className="p-6 text-center"><Loader2 size={20} className="animate-spin text-nexus-purple mx-auto" /></div>
            ) : (!calculos || calculos.length === 0) ? (
              <p className="p-6 text-nexus-muted text-sm text-center">Nenhum cálculo realizado ainda</p>
            ) : (
              <div className="divide-y divide-nexus-borderLight">
                {calculos.map(c => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-nexus-bg/30 transition-colors" onClick={() => verDetalhes(c.id)}>
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
                        <ChevronDown size={16} className={`text-nexus-muted transition-transform ${expandedCalc === c.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {expandedCalc === c.id && calcDetalhes?.resultados && (
                      <div className="px-4 pb-4 border-t border-nexus-borderLight pt-3">
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
                            {calcDetalhes.resultados.map((r: any, i: number) => (
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
