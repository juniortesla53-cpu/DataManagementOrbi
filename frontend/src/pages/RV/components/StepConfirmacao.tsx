import { useState } from 'react';
import { CheckCircle, ChevronLeft, Loader2, Save, PartyPopper, ExternalLink, Calendar, Users, DollarSign, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
  periodo: string;
  regrasSelecionadas: number[];
  simulacao: any;
  onBack: () => void;
}

export default function StepConfirmacao({ periodo, regrasSelecionadas, simulacao, onBack }: Props) {
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const salvar = async () => {
    setSalvando(true);
    try {
      const { data } = await api.post('/rv/calcular', {
        periodo,
        regraIds: regrasSelecionadas,
        observacoes: observacoes.trim() || undefined,
      });
      setResultado(data);
      setSalvo(true);
      showSuccess(`Cálculo salvo! ${data.totalColaboradores} colaboradores, R$ ${data.totalRV?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao salvar cálculo');
    } finally {
      setSalvando(false);
    }
  };

  if (salvo) {
    return (
      <div className="animate-fadeIn">
        <div className="card p-8 text-center max-w-lg mx-auto">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <PartyPopper size={36} className="text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-nexus-text mb-2">Cálculo Salvo com Sucesso! 🎉</h2>
          <p className="text-sm text-nexus-muted mb-6">
            O cálculo de RV para <span className="font-semibold text-nexus-purple">{periodo}</span> foi registrado como <span className="font-semibold text-amber-600">rascunho</span>
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-nexus-bg rounded-lg p-3">
              <p className="text-lg font-bold text-nexus-text">{resultado?.totalColaboradores}</p>
              <p className="text-[10px] text-nexus-muted">Colaboradores</p>
            </div>
            <div className="bg-nexus-bg rounded-lg p-3">
              <p className="text-lg font-bold text-nexus-text">{resultado?.totalRegras}</p>
              <p className="text-[10px] text-nexus-muted">Regras</p>
            </div>
            <div className="bg-nexus-bg rounded-lg p-3">
              <p className="text-lg font-bold text-emerald-600">
                R$ {(resultado?.totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-nexus-muted">Total RV</p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/rv/resultados')}
              className="flex items-center gap-2 px-5 py-2.5 btn-gradient rounded-lg text-sm font-semibold"
            >
              Ver Resultados
              <ExternalLink size={14} />
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-nexus-textSecondary bg-nexus-bg border border-nexus-border hover:border-nexus-muted transition-colors"
            >
              Novo Cálculo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { colaboradores, totalRV, totalColaboradores, totalRegras, regrasUsadas } = simulacao || {};

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Resumo do cálculo */}
      <div className="card overflow-hidden">
        <div className="gradient-brand p-5 text-white">
          <h3 className="text-lg font-bold">Confirmar Cálculo de RV</h3>
          <p className="text-white/70 text-xs mt-1">Revise os dados antes de salvar. O cálculo será criado como rascunho.</p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar size={16} className="text-nexus-purple" />
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Período</p>
                <p className="text-sm font-bold text-nexus-text">{periodo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users size={16} className="text-nexus-blue" />
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Colaboradores</p>
                <p className="text-sm font-bold text-nexus-text">{totalColaboradores}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Award size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Regras</p>
                <p className="text-sm font-bold text-nexus-text">{totalRegras}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Total RV</p>
                <p className="text-sm font-bold text-emerald-600">
                  R$ {(totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Regras usadas */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-nexus-muted uppercase tracking-wide mb-2">Regras aplicadas</p>
            <div className="flex flex-wrap gap-2">
              {(regrasUsadas || []).map((r: any) => (
                <span key={r.id} className="text-xs px-3 py-1 rounded-full bg-purple-100 text-nexus-purple font-medium">
                  {r.nome}
                </span>
              ))}
            </div>
          </div>

          {/* Tabela resumida por colaborador */}
          <div className="border border-nexus-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-nexus-bg border-b border-nexus-border">
                  <th className="text-left p-3 font-semibold text-nexus-muted text-xs">Colaborador</th>
                  <th className="text-left p-3 font-semibold text-nexus-muted text-xs">Matrícula</th>
                  <th className="text-right p-3 font-semibold text-nexus-muted text-xs">Total RV</th>
                </tr>
              </thead>
              <tbody>
                {(colaboradores || []).map((c: any, i: number) => (
                  <tr key={c.matricula} className={`border-b border-nexus-borderLight ${i % 2 === 0 ? '' : 'bg-nexus-bg/30'}`}>
                    <td className="p-3 font-medium text-nexus-text">{c.nome}</td>
                    <td className="p-3 text-nexus-textSecondary">{c.matricula}</td>
                    <td className={`p-3 text-right font-bold ${c.total_rv > 0 ? 'text-emerald-600' : 'text-nexus-muted'}`}>
                      R$ {(c.total_rv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-purple-50 to-blue-50 font-bold">
                  <td colSpan={2} className="p-3 text-nexus-text">TOTAL</td>
                  <td className="p-3 text-right text-nexus-purple text-base">
                    R$ {(totalRV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div className="card p-5">
        <label className="block text-xs font-semibold text-nexus-muted uppercase tracking-wide mb-2">
          Observações (opcional)
        </label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          placeholder="Adicione notas sobre este cálculo..."
          rows={3}
          className="w-full px-4 py-3 bg-nexus-bg border border-nexus-border rounded-lg text-sm resize-none"
        />
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
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 px-8 py-3 btn-gradient rounded-lg text-sm font-bold disabled:opacity-50 shadow-lg shadow-purple-500/20"
        >
          {salvando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} />
              Confirmar e Salvar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
