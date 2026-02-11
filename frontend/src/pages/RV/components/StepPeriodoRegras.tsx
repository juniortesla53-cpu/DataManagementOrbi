import { useState, useEffect } from 'react';
import { Calendar, Shield, ChevronRight, Loader2, Users, CheckSquare, Square } from 'lucide-react';
import api from '../../../api';

interface Props {
  periodo: string;
  setPeriodo: (p: string) => void;
  regrasSelecionadas: number[];
  setRegrasSelecionadas: (r: number[]) => void;
  onNext: () => void;
}

export default function StepPeriodoRegras({ periodo, setPeriodo, regrasSelecionadas, setRegrasSelecionadas, onNext }: Props) {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [regras, setRegras] = useState<any[]>([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);
  const [loadingRegras, setLoadingRegras] = useState(true);
  const [qtdColaboradores, setQtdColaboradores] = useState<number | null>(null);
  const [loadingColab, setLoadingColab] = useState(false);

  useEffect(() => {
    api.get('/rv/periodos').then(r => setPeriodos(r.data)).finally(() => setLoadingPeriodos(false));
    api.get('/rv/regras').then(r => setRegras(r.data.filter((rg: any) => rg.ativo))).finally(() => setLoadingRegras(false));
  }, []);

  // Quando período muda, buscar qtd de colaboradores
  useEffect(() => {
    if (!periodo) { setQtdColaboradores(null); return; }
    setLoadingColab(true);
    api.get(`/rv/colaboradores-periodo?periodo=${periodo}`)
      .then(r => setQtdColaboradores(r.data.colaboradores?.length || 0))
      .finally(() => setLoadingColab(false));
  }, [periodo]);

  // Auto-selecionar todas as regras quando carregam
  useEffect(() => {
    if (regras.length > 0 && regrasSelecionadas.length === 0) {
      setRegrasSelecionadas(regras.map(r => r.id));
    }
  }, [regras]);

  const toggleRegra = (id: number) => {
    if (regrasSelecionadas.includes(id)) {
      setRegrasSelecionadas(regrasSelecionadas.filter(r => r !== id));
    } else {
      setRegrasSelecionadas([...regrasSelecionadas, id]);
    }
  };

  const toggleTodas = () => {
    if (regrasSelecionadas.length === regras.length) {
      setRegrasSelecionadas([]);
    } else {
      setRegrasSelecionadas(regras.map(r => r.id));
    }
  };

  const canProceed = periodo && regrasSelecionadas.length > 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Período */}
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
        {periodo && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-nexus-bg rounded-lg">
            <Users size={16} className="text-nexus-muted" />
            {loadingColab ? (
              <Loader2 size={14} className="animate-spin text-nexus-muted" />
            ) : (
              <span className="text-sm text-nexus-textSecondary">
                <span className="font-bold text-nexus-text">{qtdColaboradores}</span> colaboradores com dados em <span className="font-semibold text-nexus-purple">{periodo}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Regras */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield size={16} className="text-nexus-blue" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-nexus-text">Regras de Cálculo</h3>
              <p className="text-[10px] text-nexus-muted">Selecione quais regras aplicar neste cálculo</p>
            </div>
          </div>
          <button
            onClick={toggleTodas}
            className="text-xs font-medium text-nexus-purple hover:text-nexus-purpleDark transition-colors"
          >
            {regrasSelecionadas.length === regras.length ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
        </div>

        {loadingRegras ? (
          <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-nexus-purple" /></div>
        ) : regras.length === 0 ? (
          <p className="text-sm text-nexus-muted text-center py-6">Nenhuma regra ativa cadastrada</p>
        ) : (
          <div className="space-y-2">
            {regras.map(regra => {
              const selecionada = regrasSelecionadas.includes(regra.id);
              return (
                <button
                  key={regra.id}
                  onClick={() => toggleRegra(regra.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                    selecionada
                      ? 'border-nexus-purple bg-purple-50 shadow-sm'
                      : 'border-nexus-border bg-white hover:border-nexus-mutedLight'
                  }`}
                >
                  {selecionada ? (
                    <CheckSquare size={18} className="text-nexus-purple flex-shrink-0" />
                  ) : (
                    <Square size={18} className="text-nexus-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${selecionada ? 'text-nexus-purple' : 'text-nexus-text'}`}>{regra.nome}</p>
                    {regra.descricao && <p className="text-[11px] text-nexus-muted truncate">{regra.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-nexus-bg text-nexus-muted font-medium">
                      {regra.faixas?.length || 0} faixas
                    </span>
                    {regra.condicoes?.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                        {regra.condicoes.length} condição(ões)
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Resumo seleção */}
        <div className="mt-4 pt-3 border-t border-nexus-borderLight flex items-center justify-between">
          <span className="text-xs text-nexus-muted">
            {regrasSelecionadas.length} de {regras.length} regras selecionadas
          </span>
        </div>
      </div>

      {/* Botão Próximo */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
        >
          Próximo
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
