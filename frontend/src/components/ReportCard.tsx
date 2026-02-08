import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  id: number;
  nome: string;
  descricao: string | null;
  categoria: string | null;
}

const catColors: Record<string, string> = {
  'Comercial': 'bg-blue-500/20 text-blue-400',
  'RH': 'bg-purple-500/20 text-purple-400',
  'Financeiro': 'bg-green-500/20 text-green-400',
  'Operações': 'bg-orange-500/20 text-orange-400',
};

export default function ReportCard({ id, nome, descricao, categoria }: Props) {
  const nav = useNavigate();
  return (
    <div onClick={() => nav(`/report/${id}`)}
      className="bg-orbi-card border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-orbi-accent/50 hover:shadow-lg hover:shadow-orbi-accent/5 transition-all group">
      <div className="w-full h-28 bg-orbi-bg rounded-lg flex items-center justify-center mb-3">
        <BarChart3 size={32} className="text-orbi-muted group-hover:text-orbi-accent transition-colors" />
      </div>
      <h3 className="font-semibold text-sm mb-1 group-hover:text-orbi-accent transition-colors">{nome}</h3>
      {descricao && <p className="text-xs text-orbi-muted line-clamp-2 mb-2">{descricao}</p>}
      {categoria && (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catColors[categoria] || 'bg-slate-500/20 text-slate-400'}`}>
          {categoria}
        </span>
      )}
    </div>
  );
}
