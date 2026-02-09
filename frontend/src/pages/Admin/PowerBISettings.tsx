import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlugZap, Unplug, TestTube, LogIn, Settings2, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
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
  const { data: status, loading, error, refetch } = useApi<PbiStatus>('/admin/powerbi/status');
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState({ clientId: '', clientSecret: '', tenantId: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    if (status) {
      setForm(f => ({ ...f, clientId: status.clientId || '', tenantId: status.tenantId || '' }));
      // Auto-show advanced if not configured yet
      if (!status.configured) setShowAdvanced(true);
    }
  }, [status]);

  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');
    if (success) {
      showSuccess('Conta Microsoft conectada com sucesso!');
      refetch();
    }
    if (errorParam) {
      showError(`Erro ao conectar: ${errorParam}`);
    }
  }, [searchParams]);

  const saveConfig = async () => {
    if (!form.clientId || !form.tenantId || !form.clientSecret) {
      showError('Preencha todos os campos');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/powerbi/config', form);
      showSuccess('Credenciais salvas!');
      setShowAdvanced(false);
      refetch();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const { data } = await api.get('/admin/powerbi/auth-url');
      window.location.href = data.url;
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao iniciar login');
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Desconectar a conta? Os relatórios deixarão de funcionar até reconectar.')) return;
    setDisconnecting(true);
    try {
      await api.post('/admin/powerbi/disconnect');
      showSuccess('Conta desconectada');
      refetch();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.get('/admin/powerbi/test');
      setWorkspaces(data.workspaces || []);
      showSuccess(`Conexão OK! ${data.workspaces?.length || 0} workspaces encontrados.`);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Falha no teste');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orbi-accent" />
          <p className="text-orbi-muted text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-orbi-danger" />
          <h3 className="text-lg font-semibold">Erro ao carregar</h3>
          <p className="text-orbi-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-bold mb-6">Power BI</h1>

      {/* Main Connection Card */}
      <div className="bg-orbi-card border border-slate-700/50 rounded-xl p-6 mb-4">
        {status.connected ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-orbi-success/20 flex items-center justify-center">
                <PlugZap size={24} className="text-orbi-success" />
              </div>
              <div>
                <p className="font-semibold">Conectado ao Power BI</p>
                <p className="text-xs text-orbi-muted">
                  {status.connectedUser} — desde {new Date(status.connectedAt!).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={testConnection}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 bg-orbi-accent/20 hover:bg-orbi-accent/30 disabled:opacity-50 text-orbi-accent rounded-lg text-sm font-medium transition-colors">
                {testing ? <Loader2 size={16} className="animate-spin" /> : <TestTube size={16} />}
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
              <button
                onClick={disconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-4 py-2 bg-orbi-danger/20 hover:bg-orbi-danger/30 disabled:opacity-50 text-orbi-danger rounded-lg text-sm font-medium transition-colors">
                {disconnecting ? <Loader2 size={16} className="animate-spin" /> : <Unplug size={16} />}
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/cf/New_Power_BI_Logo.svg" alt="Power BI" className="w-8 h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <h2 className="font-semibold text-base mb-1">Conecte sua conta Microsoft</h2>
              <p className="text-xs text-orbi-muted mb-6 max-w-sm mx-auto">
                Faça login com sua conta Microsoft que tem acesso ao Power BI para habilitar os relatórios.
                <br />
                <span className="text-orbi-muted/70">Funciona com licenças Pro e Free.</span>
              </p>

              {status.configured ? (
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-orbi-accent hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors">
                  {connecting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                  {connecting ? 'Redirecionando...' : 'Entrar com Microsoft'}
                </button>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-200 max-w-sm mx-auto">
                  <p>Configure as credenciais do aplicativo abaixo antes de conectar.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Workspaces */}
      {workspaces.length > 0 && (
        <div className="bg-orbi-card border border-slate-700/50 rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold mb-2">Workspaces disponíveis</h3>
          <div className="space-y-1">
            {workspaces.map((w: any) => (
              <div key={w.id} className="text-xs text-orbi-muted px-2 py-1.5 bg-orbi-bg rounded">
                {w.name} <span className="text-[10px] opacity-50">({w.id})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Config (collapsible) */}
      <div className="bg-orbi-card border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-orbi-muted" />
            <span className="text-sm font-medium text-orbi-muted">Configurações avançadas</span>
            {status.configured && <CheckCircle size={14} className="text-orbi-success" />}
          </div>
          {showAdvanced ? <ChevronUp size={16} className="text-orbi-muted" /> : <ChevronDown size={16} className="text-orbi-muted" />}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 border-t border-slate-700/30 pt-4">
            <p className="text-[11px] text-orbi-muted mb-4">
              Credenciais do aplicativo registrado no Azure AD. Necessário para autenticação com a API do Power BI.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1">TENANT ID <span className="text-orbi-danger">*</span></label>
                <input
                  type="text"
                  value={form.tenantId}
                  onChange={e => setForm({ ...form, tenantId: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1">CLIENT ID <span className="text-orbi-danger">*</span></label>
                <input
                  type="text"
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent"
                />
              </div>
              <div>
                <label className="block text-[10px] text-orbi-muted mb-1">CLIENT SECRET <span className="text-orbi-danger">*</span></label>
                <input
                  type="password"
                  value={form.clientSecret}
                  onChange={e => setForm({ ...form, clientSecret: e.target.value })}
                  placeholder="Valor do secret"
                  className="w-full px-2 py-1.5 bg-orbi-bg border border-slate-700 rounded text-xs focus:outline-none focus:border-orbi-accent"
                />
              </div>
              <button
                onClick={saveConfig}
                disabled={saving}
                className="w-full py-2 bg-orbi-accent hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar Credenciais'}
              </button>

              <details className="mt-2">
                <summary className="text-[10px] text-orbi-muted cursor-pointer hover:text-orbi-accent">
                  Como obter essas credenciais?
                </summary>
                <div className="mt-2 p-3 bg-orbi-bg rounded-lg text-[10px] text-orbi-muted leading-relaxed">
                  1. Acesse <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noreferrer" className="text-orbi-accent hover:underline">Azure Portal → App Registrations</a><br />
                  2. "New Registration" → nome: "Orbi" → tipo: Web<br />
                  3. Redirect URI: <code className="bg-slate-700 px-1 rounded">http://localhost:3001/api/admin/powerbi/callback</code><br />
                  4. API Permissions → Power BI Service → Report.Read.All, Dataset.Read.All<br />
                  5. Certificates & Secrets → novo Client Secret<br />
                  6. Copie Tenant ID, Client ID e Client Secret aqui
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
