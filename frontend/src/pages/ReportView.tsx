import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import api from '../api';

export default function ReportView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    api.get(`/reports/${id}`).then(r => setReport(r.data)).catch(() => nav('/'));
  }, [id]);

  if (!report) return <div className="flex h-full items-center justify-center text-orbi-muted">Carregando...</div>;

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-orbi-bg' : 'h-full'}`}>
      <div className="h-10 flex items-center gap-3 px-4 bg-orbi-nav border-b border-slate-700/50 flex-shrink-0">
        <button onClick={() => nav('/')} className="p-1 rounded hover:bg-slate-700/50 text-orbi-muted"><ArrowLeft size={16} /></button>
        <span className="text-sm font-medium flex-1 truncate">{report.nome}</span>
        {report.categoria && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orbi-accent/20 text-orbi-accent">{report.categoria}</span>}
        <button onClick={() => setFullscreen(!fullscreen)} className="p-1 rounded hover:bg-slate-700/50 text-orbi-muted">
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <iframe src={report.link_powerbi} className="flex-1 w-full border-0" title={report.nome} allowFullScreen />
    </div>
  );
}
