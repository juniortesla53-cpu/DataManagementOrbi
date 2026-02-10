import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PlugZap, Unplug, TestTube, LogIn, Settings2, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';

interface PbiStatus { configured: boolean; connected: boolean; clientId: string; tenantId: string; connectedUser: string | null; connectedAt: string | null; }

export default function PowerBISettings() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const { data: status, loading, error, refetch } = useApi<PbiStatus>('/admin/powerbi/status');
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState({ clientId: '', clientSecret: '', tenantId: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => { if (status) { setForm(f => ({ ...f, clientId: status.clientId || '', tenantId: status.tenantId || '' })); if (!status.configured) setShowAdvanced(true); } }, [status]);
  useEffect(() => { const s = searchParams.get('success'); const e = searchParams.get('error'); if (s) { showSuccess('Conectado!'); refetch(); } if (e) { showError(`Erro: ${e}`); } }, [searchParams]);

  const saveConfig = async () => {
    if (!form.clientId || !form.tenantId || !form.clientSecret) { showError('Preencha todos os campos'); return; }
    setSaving(true);
    try { await api.post('/admin/powerbi/config', form); showSuccess('Credenciais salvas!'); setShowAdvanced(false); refetch(); }
    catch (err: any) { showError(err.response?.data?.error || 'Erro'); } finally { setSaving(false); }
  };
  const connect = async () => { setConnecting(true); try { const { data } = await api.get('/admin/powerbi/auth-url'); window.location.href = data.url; } catch (err: any) { showError(err.response?.data?.error || 'Erro'); setConnecting(false); } };
  const disconnect = async () => { if (!confirm('Desconectar?')) return; setDisconnecting(true); try { await api.post('/admin/powerbi/disconnect'); showSuccess('Desconectado'); refetch(); } catch (err: any) { showError(err.response?.data?.error || 'Erro'); } finally { setDisconnecting(false); } };
  const testConn = async () => { setTesting(true); try { const { data } = await api.get('/admin/powerbi/test'); setWorkspaces(data.workspaces || []); showSuccess(`OK! ${data.workspaces?.length || 0} workspaces`); } catch (err: any) { showError(err.response?.data?.error || 'Falha'); } finally { setTesting(false); } };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;
  if (!status) return null;

  return (
    <div className="p-6 max-w-2xl space-y-4 animate-fadeIn">
      <h1 className="text-lg font-bold text-nexus-text">Power BI</h1>

      {/* Connection Card */}
      <div className="card p-6">
        {status.connected ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center"><PlugZap size={22} className="text-emerald-600" /></div>
              <div>
                <p className="font-semibold text-nexus-text">Conectado ao Power BI</p>
                <p className="text-xs text-nexus-muted">{status.connectedUser} — desde {new Date(status.connectedAt!).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={testConn} disabled={testing} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-nexus-blue rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}{testing ? 'Testando...' : 'Testar'}
              </button>
              <button onClick={disconnect} disabled={disconnecting} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-nexus-danger rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}{disconnecting ? '...' : 'Desconectar'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-glow">
              <PlugZap size={24} className="text-white" />
            </div>
            <h2 className="font-bold text-nexus-text mb-1">Conecte sua conta Microsoft</h2>
            <p className="text-xs text-nexus-muted mb-6 max-w-sm mx-auto">Faça login com sua conta que tem acesso ao Power BI.<br />Funciona com Pro e Free.</p>
            {status.configured ? (
              <button onClick={connect} disabled={connecting} className="inline-flex items-center gap-2 px-6 py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50">
                {connecting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}{connecting ? 'Redirecionando...' : 'Entrar com Microsoft'}
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 max-w-sm mx-auto">Configure as credenciais abaixo antes de conectar.</div>
            )}
          </div>
        )}
      </div>

      {/* Workspaces */}
      {workspaces.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-nexus-text mb-2">Workspaces</h3>
          <div className="space-y-1">{workspaces.map((w: any) => (<div key={w.id} className="text-xs text-nexus-textSecondary px-3 py-2 bg-nexus-bg rounded-lg">{w.name} <span className="text-nexus-muted text-[10px]">({w.id})</span></div>))}</div>
        </div>
      )}

      {/* Advanced */}
      <div className="card overflow-hidden">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between p-4 hover:bg-nexus-bg transition-colors">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-nexus-muted" />
            <span className="text-sm font-medium text-nexus-textSecondary">Configurações avançadas</span>
            {status.configured && <CheckCircle size={14} className="text-emerald-500" />}
          </div>
          {showAdvanced ? <ChevronUp size={16} className="text-nexus-muted" /> : <ChevronDown size={16} className="text-nexus-muted" />}
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 border-t border-nexus-border pt-4 space-y-3">
            <p className="text-[11px] text-nexus-muted">Credenciais do app registrado no Azure AD.</p>
            {(['tenantId', 'clientId', 'clientSecret'] as const).map(f => (
              <div key={f}>
                <label className="block text-[10px] text-nexus-muted mb-1 font-semibold uppercase">{f === 'tenantId' ? 'Tenant ID' : f === 'clientId' ? 'Client ID' : 'Client Secret'}</label>
                <input type={f === 'clientSecret' ? 'password' : 'text'} value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs transition-all" />
              </div>
            ))}
            <button onClick={saveConfig} disabled={saving} className="w-full py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Salvando...' : 'Salvar Credenciais'}
            </button>
            <button onClick={() => nav('/admin/powerbi/setup-guide')} className="flex items-center gap-2 text-xs text-nexus-purple hover:text-nexus-purpleDark transition-colors">
              <BookOpen size={14} />Como obter essas credenciais?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
