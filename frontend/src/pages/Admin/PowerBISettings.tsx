import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plug, PlugZap, Unplug, TestTube, ExternalLink, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api';

interface PbiStatus {
  configured: boolean;
  connected: boolean;
  clientId: string;
  tenantId: string;
  connectedUser: string | null;
  connectedAt: string | null;
}

export default function PowerBISettings() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PbiStatus | null>(null);
  const [form, setForm] = useState({ clientId: '', clientSecret: '', tenantId: '' });
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  const loadStatus = async () => {
    try {
      const { data } = await api.get('/admin/powerbi/status');
      setStatus(data);
      setForm(f => ({ ...f, clientId: data.clientId || '', tenantId: data.tenantId || '' }));
    } catch { }
  };

  useEffect(() => {
    loadStatus();
    // Check for callback results
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success) setMessage({ type: 'success', text: 'Conta Microsoft conectada com sucesso!' });
    if (error) setMessage({ type: 'error', text: `Erro ao conectar: ${error}` });
  }, []);

  const saveConfig = async () => {
    setLoading(true);
    try {
      await api.post('/admin/powerbi/config', form);
      setMessage({ type: 'success', text: 'Configuração salva!' });
      setShowConfig(false);
      loadStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar' });
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/powerbi/auth-url');
      window.location.href = data.url;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao gerar URL de login' });
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Desconectar a conta Microsoft? Os relatórios deixarão de funcionar até reconectar.')) return;
    setLoading(true);
    try {
      await api.post('/admin/powerbi/disconnect');
      setMessage({ type: 'success', text: 'Conta desconectada.' });
      loadStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao desconectar' });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/powerbi/test');
      setWorkspaces(data.workspaces || []);
      setMessage({ type: 'success', text: `Conexão OK! ${data.workspaces?.length || 0} workspaces encontrados.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Falha no teste' });
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <div className="p-6 text-orbi-muted">Carregando...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-bold mb-6">Configuração Power BI</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-orbi-success/10 border border-orbi-success/30 text-orbi-success' : 'bg-orbi-danger/10 border border-orbi-danger/30 text-orbi-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="bg-orbi-card border border-slate-700/50 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          {status.connected ? (
            <div className="w-10 h-10 rounded-full bg-orbi-success/20 flex items-center justify-center"><PlugZap size={20} className="text-orbi-success" /></div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center"><Plug size={20} className="text-orbi-muted" /></div>
          )}
          <div>
            <p className="font-semibold text-sm">{status.connected ? 'Conectado' : 'Não conectado'}</p>
            {status.connected && status.connectedUser && (
              <p className="text-xs text-orbi-muted">{status.connectedUser} — desde {new Date(status.connectedAt!).toLocaleString('pt-BR')}</p>
            )}
            {!status.connected && <p className="text-xs text-orbi-muted">Conecte sua conta Microsoft para os relatórios funcionarem</p>}
          </div>
        </div>

        <div className="flex gap-2">
          {status.connected ? (
            <>
              <button onClick={testConnection} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-orbi-accent/20 hover:bg-orbi-accent/30 text-orbi-accent rounded-lg text-xs font-medium transition-colors">
                <TestTube size={14} /> Testar Conexão
              </button>
              <button onClick={disconnect} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-orbi-danger/20 hover:bg-orbi-danger/30 text-orbi-danger rounded-lg text-xs font-medium transition-colors">
                <Unplug size={14} /> Desconectar
              </button>
            </>
          ) : (
            <>
              {status.configured ? (
                <button onClick={connect} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-orbi-accent hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">
                  <ExternalLink size={16} /> Conectar Conta Microsoft
                </button>
              ) : (
                <p className="text-xs text-orbi-muted">Configure o Azure AD abaixo primeiro.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Workspaces (if tested) */}
      {workspaces.length > 0 && (
        <div className="bg-orbi-card border border-slate-700/50 rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold mb-2">Workspaces disponíveis</h3>
          <div className="space-y-1">
            {workspaces.map((w: any) => (
              <div key={w.id} className="text-xs text-orbi-muted px-2 py-1 bg-orbi-bg rounded">{w.name} <span className="text-[10px] opacity-50">({w.id})</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Azure AD Configuration */}
      <div className="bg-orbi-card border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-orbi-accent" />
            <h3 className="text-sm font-semibold">Configuração Azure AD</h3>
          </div>
          <button onClick={() => setShowConfig(!showConfig)} className="text-xs text-orbi-accent hover:underline">
            {showConfig ? 'Ocultar' : 'Editar'}
          </button>
        </div>

        {!showConfig ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-orbi-muted">Tenant ID:</span>
              <span>{status.tenantId || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-orbi-muted">Client ID:</span>
              <span>{status.clientId || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-orbi-muted">Client Secret:</span>
              <span>{status.configured ? '••••••••' : '—'}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-orbi-muted mb-1">TENANT ID</label>
              <input type="text" value={form.tenantId} onChange={e => setForm({...form, tenantId: e.target.value})}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent" />
            </div>
            <div>
              <label className="block text-[10px] text-orbi-muted mb-1">CLIENT ID (Application ID)</label>
              <input type="text" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent" />
            </div>
            <div>
              <label className="block text-[10px] text-orbi-muted mb-1">CLIENT SECRET</label>
              <input type="password" value={form.clientSecret} onChange={e => setForm({...form, clientSecret: e.target.value})}
                placeholder="Valor do secret"
                className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent" />
            </div>
            <button onClick={saveConfig} disabled={loading}
              className="w-full py-2 bg-orbi-accent hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors">
              Salvar Configuração
            </button>

            <div className="mt-3 p-3 bg-orbi-bg rounded-lg">
              <p className="text-[10px] text-orbi-muted leading-relaxed">
                <strong>Como configurar:</strong><br />
                1. Acesse <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" className="text-orbi-accent hover:underline">Azure Portal → App Registrations</a><br />
                2. Clique "New Registration" → nome: "Orbi" → tipo: Web<br />
                3. Redirect URI: <code className="bg-slate-700 px-1 rounded">http://localhost:3001/api/admin/powerbi/callback</code><br />
                4. Em "API Permissions" adicione: Power BI Service → Report.Read.All, Dataset.Read.All<br />
                5. Em "Certificates & Secrets" crie um Client Secret<br />
                6. Copie Tenant ID, Client ID e Client Secret aqui
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
