import { BarChart3, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  id: number;
  nome: string;
  descricao: string | null;
  categoria: string | null;
}

const catColors: Record<string, string> = {
  'Comercial': 'bg-blue-100 text-blue-700',
  'RH': 'bg-purple-100 text-purple-700',
  'Financeiro': 'bg-emerald-100 text-emerald-700',
  'Operações': 'bg-orange-100 text-orange-700',
};

export default function ReportCard({ id, nome, descricao, categoria }: Props) {
  const nav = useNavigate();
  const badge = (categoria && catColors[categoria]) || 'bg-slate-100 text-slate-600';

  return (
    <div
      onClick={() => nav(`/report/${id}`)}
      className="card card-interactive cursor-pointer p-5 group"
    >
      {/* Preview */}
      <div className="w-full h-28 bg-gradient-to-br from-orbi-bg to-orbi-borderLight rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
        <BarChart3 size={32} className="text-orbi-purple/40 group-hover:text-orbi-purple group-hover:scale-110 transition-all duration-300" />
        {/* Gradient line top on hover */}
        <div className="absolute top-0 inset-x-0 h-[2px] gradient-brand-r scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-orbi-text group-hover:text-orbi-purple transition-colors mb-1 line-clamp-2 min-h-[2.5rem]">
        {nome}
      </h3>

      {/* Description */}
      {descricao && (
        <p className="text-xs text-orbi-muted line-clamp-2 mb-3">{descricao}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        {categoria ? (
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${badge}`}>{categoria}</span>
        ) : <span />}
        <ArrowRight size={16} className="text-orbi-purple opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" />
      </div>
    </div>
  );
}
