import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import * as pbi from 'powerbi-client';
import api from '../api';

export default function ReportView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [embedData, setEmbedData] = useState<any>(null);
  const [error, setError] = useState('');
  const embedRef = useRef<HTMLDivElement>(null);
  const pbiRef = useRef<pbi.Embed | null>(null);

  useEffect(() => {
    api.get(`/reports/${id}`).then(r => setReport(r.data)).catch(() => nav('/'));
  }, [id]);

  useEffect(() => {
    if (!report) return;
    // Try to get embed token
    api.get(`/reports/${report.id}/embed`).then(r => {
      setEmbedData(r.data);
    }).catch(() => {
      setEmbedData({ embedUrl: report.link_powerbi, fallback: true });
    });
  }, [report]);

  useEffect(() => {
    if (!embedData || !embedRef.current) return;

    if (!embedData.fallback && embedData.embedToken) {
      // Use Power BI JS SDK
      const powerbi = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );

      const config: pbi.IEmbedConfiguration = {
        type: 'report',
        tokenType: pbi.models.TokenType.Embed,
        accessToken: embedData.embedToken,
        embedUrl: embedData.embedUrl,
        id: embedData.reportId,
        settings: {
          panes: {
            filters: { visible: false },
            pageNavigation: { visible: true },
          },
          background: pbi.models.BackgroundType.Transparent,
          layoutType: pbi.models.LayoutType.Custom,
          customLayout: {
            displayOption: pbi.models.DisplayOption.FitToPage,
          },
        },
      };

      pbiRef.current = powerbi.embed(embedRef.current, config);

      return () => {
        if (pbiRef.current) {
          pbiRef.current.off('loaded');
          pbiRef.current.off('error');
        }
      };
    }
  }, [embedData]);

  if (!report) return <div className="flex h-full items-center justify-center text-orbi-muted">Carregando...</div>;

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-orbi-bg' : 'h-full'}`}>
      <div className="h-10 flex items-center gap-3 px-4 bg-orbi-nav border-b border-slate-700/50 flex-shrink-0">
        <button onClick={() => nav('/')} className="p-1 rounded hover:bg-slate-700/50 text-orbi-muted"><ArrowLeft size={16} /></button>
        <span className="text-sm font-medium flex-1 truncate">{report.nome}</span>
        {report.categoria && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orbi-accent/20 text-orbi-accent">{report.categoria}</span>}
        {embedData?.fallback && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <AlertCircle size={10} /> Modo iframe
          </span>
        )}
        <button onClick={() => setFullscreen(!fullscreen)} className="p-1 rounded hover:bg-slate-700/50 text-orbi-muted">
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {embedData?.fallback ? (
        <iframe src={report.link_powerbi} className="flex-1 w-full border-0" title={report.nome} allowFullScreen />
      ) : (
        <div ref={embedRef} className="flex-1 w-full" />
      )}
    </div>
  );
}
