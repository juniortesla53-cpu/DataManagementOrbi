import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, X, AlertCircle, Loader2 } from 'lucide-react';
import * as pbi from 'powerbi-client';
import api from '../api';

export default function ReportView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [embedData, setEmbedData] = useState<any>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const pbiRef = useRef<pbi.Embed | null>(null);
  const toolbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/reports/${id}`).then(r => setReport(r.data)).catch(() => nav('/'));
  }, [id, nav]);

  useEffect(() => {
    if (!report) return;
    api.get(`/reports/${report.id}/embed`).then(r => {
      setEmbedData(r.data);
    }).catch(() => {
      setEmbedData({ embedUrl: report.link_powerbi, fallback: true });
    });
  }, [report]);

  useEffect(() => {
    if (!embedData || !embedRef.current) return;
    if (!embedData.fallback && embedData.embedToken) {
      const powerbi = new pbi.service.Service(pbi.factories.hpmFactory, pbi.factories.wpmpFactory, pbi.factories.routerFactory);
      const config: pbi.IEmbedConfiguration = {
        type: 'report',
        tokenType: pbi.models.TokenType.Embed,
        accessToken: embedData.embedToken,
        embedUrl: embedData.embedUrl,
        id: embedData.reportId,
        permissions: pbi.models.Permissions.Read,
        settings: {
          panes: { filters: { expanded: false, visible: false }, pageNavigation: { visible: false }, bookmarks: { visible: false } },
          bars: { statusBar: { visible: false }, actionBar: { visible: false } },
          background: pbi.models.BackgroundType.Transparent,
          layoutType: pbi.models.LayoutType.Custom,
          customLayout: { displayOption: pbi.models.DisplayOption.FitToPage },
        },
      };
      pbiRef.current = powerbi.embed(embedRef.current, config);
      return () => { pbiRef.current?.off('loaded'); pbiRef.current?.off('error'); };
    }
  }, [embedData]);

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) setShowToolbar(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onMove = (e: MouseEvent) => {
      if (e.clientY < 60) {
        setShowToolbar(true);
        if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
      } else if (showToolbar) {
        if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
        toolbarTimeoutRef.current = setTimeout(() => setShowToolbar(false), 2000);
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current); };
  }, [isFullscreen, showToolbar]);

  const enterFs = async () => { try { await containerRef.current?.requestFullscreen(); } catch {} };
  const exitFs = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {} };

  if (!report) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fadeIn">
          <Loader2 className="w-10 h-10 animate-spin text-orbi-purple" />
          <p className="text-orbi-muted text-sm">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      {/* Fullscreen hint */}
      {isFullscreen && !showToolbar && (
        <div className="absolute top-0 inset-x-0 h-[2px] gradient-brand-r z-50 opacity-60 pointer-events-none" />
      )}

      {/* Toolbar */}
      <div className={`${isFullscreen ? 'absolute top-0 inset-x-0 z-50' : 'relative'} h-12 flex items-center gap-3 px-4 bg-white border-b border-orbi-border shadow-soft flex-shrink-0 transition-all duration-300 ${
        isFullscreen && !showToolbar ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}>
        <button onClick={() => isFullscreen ? exitFs() : nav('/')} className="p-1.5 rounded-lg hover:bg-orbi-bg text-orbi-muted hover:text-orbi-purple transition-all">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold flex-1 truncate text-orbi-text">{report.nome}</span>
        {report.categoria && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-orbi-purple">{report.categoria}</span>
        )}
        {embedData?.fallback && (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 font-medium">
            <AlertCircle size={10} /> iframe
          </span>
        )}
        <button onClick={isFullscreen ? exitFs : enterFs} className="p-1.5 rounded-lg hover:bg-orbi-bg text-orbi-muted hover:text-orbi-purple transition-all" title={isFullscreen ? 'Sair' : 'Tela cheia'}>
          {isFullscreen ? <X size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      <div className="flex-1 w-full relative bg-white">
        {embedData?.fallback ? (
          <iframe
            src={(() => { const u = new URL(report.link_powerbi); u.searchParams.set('filterPaneEnabled','false'); u.searchParams.set('navContentPaneEnabled','false'); u.searchParams.set('chromeless','1'); return u.toString(); })()}
            className="w-full h-full border-0" title={report.nome} allowFullScreen
          />
        ) : (
          <div ref={embedRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
