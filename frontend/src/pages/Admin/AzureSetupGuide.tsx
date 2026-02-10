import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy, CheckCircle, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';

const REDIRECT_URI = `${window.location.protocol}//${window.location.hostname}:3001/api/admin/powerbi/callback`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { showSuccess } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={copy} className="p-1 rounded hover:bg-orbi-bg transition-colors" title="Copiar">
      {copied ? <CheckCircle size={14} className="text-orbi-success" /> : <Copy size={14} className="text-orbi-muted" />}
    </button>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orbi-purple to-orbi-blue flex items-center justify-center text-sm font-bold flex-shrink-0 text-white shadow-md">
      {n}
    </div>
  );
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-orbi-border rounded-xl p-5 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <StepNumber n={step} />
        <h3 className="font-semibold text-orbi-text">{title}</h3>
      </div>
      <div className="ml-11 space-y-3 text-sm text-orbi-textSecondary leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 bg-orbi-bg border border-orbi-border rounded-lg px-3 py-2 font-mono text-xs">
      <code className="flex-1 text-orbi-purple break-all">{children}</code>
      <CopyButton text={children} />
    </div>
  );
}

function InfoBox({ type = 'info', children }: { type?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    tip: 'bg-green-50 border-green-200 text-green-700',
  };

  const labels = { info: 'ℹ️ Info', warning: '⚠️ Atenção', tip: '💡 Dica' };

  return (
    <div className={`border rounded-lg p-3 text-xs ${styles[type]}`}>
      <span className="font-semibold">{labels[type]}:</span> {children}
    </div>
  );
}

export default function AzureSetupGuide() {
  const nav = useNavigate();

  return (
    <div className="p-6 max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('/admin/powerbi')} className="p-1.5 rounded-lg hover:bg-orbi-bg text-orbi-muted transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-orbi-text">Configurar acesso ao Power BI</h1>
          <p className="text-xs text-orbi-muted">Passo a passo para registrar o aplicativo no Azure e conectar ao Orbi</p>
        </div>
      </div>

      {/* Overview */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-sm mb-2 text-orbi-text">Por que isso é necessário?</h2>
        <p className="text-xs text-orbi-textSecondary leading-relaxed">
          O Power BI usa o sistema de autenticação da Microsoft (Azure AD) para permitir que aplicativos externos acessem os relatórios.
          Precisamos registrar o Orbi como um "aplicativo autorizado" na sua organização. Isso é feito uma única vez e leva cerca de <strong>5 minutos</strong>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-purple-100 text-orbi-purple font-medium">✅ Funciona com Power BI Pro</span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-orbi-blue font-medium">✅ Funciona com Power BI Free</span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">✅ Gratuito</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">

        {/* Step 1 */}
        <StepCard step={1} title="Acessar o Portal Azure">
          <p>Abra o portal de registro de aplicativos da Microsoft:</p>
          <a
            href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-orbi-blue rounded-lg text-xs font-medium transition-colors">
            <ExternalLink size={14} />
            Abrir Azure Portal — App Registrations
          </a>
          <InfoBox type="info">
            Use a mesma conta Microsoft que tem acesso aos relatórios do Power BI. Se sua empresa usa Microsoft 365, use seu email corporativo.
          </InfoBox>
        </StepCard>

        {/* Step 2 */}
        <StepCard step={2} title="Criar novo registro de aplicativo">
          <p>Clique no botão <strong>"+ New registration"</strong> (Novo registro) no topo da página.</p>
          <div className="bg-orbi-bg rounded-lg p-4 border border-orbi-border">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-orbi-muted block mb-1 font-semibold">Nome do aplicativo:</span>
                <CodeBlock>Orbi - Power BI Hub</CodeBlock>
              </div>
              <div>
                <span className="text-[10px] text-orbi-muted block mb-1 font-semibold">Tipos de conta suportados:</span>
                <p className="text-xs text-orbi-text">Selecione: <strong>"Accounts in this organizational directory only"</strong></p>
                <p className="text-[10px] text-orbi-muted">(Contas neste diretório organizacional apenas — Single tenant)</p>
              </div>
              <div>
                <span className="text-[10px] text-orbi-muted block mb-1 font-semibold">URI de redirecionamento:</span>
                <p className="text-xs mb-1 text-orbi-text">Tipo: <strong>Web</strong></p>
                <CodeBlock>{REDIRECT_URI}</CodeBlock>
              </div>
            </div>
          </div>
          <p>Clique em <strong>"Register"</strong> (Registrar).</p>
          <InfoBox type="warning">
            Se o Orbi estiver rodando em um servidor (não localhost), ajuste a URI de redirecionamento para o endereço do servidor.
          </InfoBox>
        </StepCard>

        {/* Step 3 */}
        <StepCard step={3} title="Copiar o Tenant ID e Client ID">
          <p>Após o registro, você será redirecionado para a página do aplicativo. Na seção <strong>"Overview"</strong> (Visão geral), copie:</p>
          <div className="bg-orbi-bg rounded-lg p-4 border border-orbi-border space-y-3">
            <div className="flex items-center gap-3">
              <ChevronRight size={14} className="text-orbi-purple flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-orbi-text">Application (client) ID</p>
                <p className="text-[10px] text-orbi-muted">Este é o <strong>Client ID</strong> — copie e guarde</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ChevronRight size={14} className="text-orbi-purple flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-orbi-text">Directory (tenant) ID</p>
                <p className="text-[10px] text-orbi-muted">Este é o <strong>Tenant ID</strong> — copie e guarde</p>
              </div>
            </div>
          </div>
          <InfoBox type="tip">
            Os dois IDs ficam logo no topo da página de Overview. São GUIDs no formato <code className="bg-orbi-bg px-1 rounded border border-orbi-border">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>.
          </InfoBox>
        </StepCard>

        {/* Step 4 */}
        <StepCard step={4} title="Criar um Client Secret">
          <p>No menu lateral esquerdo do aplicativo, clique em <strong>"Certificates & secrets"</strong>.</p>
          <div className="bg-orbi-bg rounded-lg p-4 border border-orbi-border space-y-2">
            <p className="text-xs text-orbi-text">1. Clique em <strong>"+ New client secret"</strong></p>
            <p className="text-xs text-orbi-text">2. Descrição: <code className="bg-white px-1 rounded border border-orbi-border">Orbi</code></p>
            <p className="text-xs text-orbi-text">3. Validade: <strong>24 months</strong> (recomendado)</p>
            <p className="text-xs text-orbi-text">4. Clique em <strong>"Add"</strong></p>
          </div>
          <InfoBox type="warning">
            <strong>Importante!</strong> Copie o <strong>Value</strong> (valor) do secret imediatamente. Ele só aparece uma vez — depois de sair da página, não será possível ver novamente. Este é o <strong>Client Secret</strong>.
          </InfoBox>
        </StepCard>

        {/* Step 5 */}
        <StepCard step={5} title="Adicionar permissões do Power BI">
          <p>No menu lateral, clique em <strong>"API permissions"</strong>.</p>
          <div className="bg-orbi-bg rounded-lg p-4 border border-orbi-border space-y-2">
            <p className="text-xs text-orbi-text">1. Clique em <strong>"+ Add a permission"</strong></p>
            <p className="text-xs text-orbi-text">2. Selecione <strong>"Power BI Service"</strong> na lista</p>
            <p className="text-xs text-orbi-text">3. Escolha <strong>"Delegated permissions"</strong></p>
            <p className="text-xs text-orbi-text">4. Marque as seguintes permissões:</p>
            <div className="ml-4 space-y-1 mt-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-orbi-success" />
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-orbi-border">Report.Read.All</code>
                <span className="text-[10px] text-orbi-muted">— Ler todos os relatórios</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-orbi-success" />
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-orbi-border">Dataset.Read.All</code>
                <span className="text-[10px] text-orbi-muted">— Ler todos os datasets</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-orbi-success" />
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-orbi-border">Workspace.Read.All</code>
                <span className="text-[10px] text-orbi-muted">— Listar workspaces</span>
              </div>
            </div>
            <p className="text-xs mt-2 text-orbi-text">5. Clique em <strong>"Add permissions"</strong></p>
          </div>
          <InfoBox type="tip">
            Se você é admin do Azure AD, clique em <strong>"Grant admin consent"</strong> para aprovar as permissões automaticamente para toda a organização.
          </InfoBox>
        </StepCard>

        {/* Step 6 */}
        <StepCard step={6} title="Colar as credenciais no Orbi">
          <p>Volte para a página de configuração do Power BI no Orbi e preencha:</p>
          <div className="bg-orbi-bg rounded-lg p-4 border border-orbi-border space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium w-28 text-orbi-text">Tenant ID</span>
              <span className="text-[10px] text-orbi-muted">→ Directory (tenant) ID do passo 3</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium w-28 text-orbi-text">Client ID</span>
              <span className="text-[10px] text-orbi-muted">→ Application (client) ID do passo 3</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium w-28 text-orbi-text">Client Secret</span>
              <span className="text-[10px] text-orbi-muted">→ Value do secret do passo 4</span>
            </div>
          </div>
          <p>Salve e clique em <strong>"Entrar com Microsoft"</strong> para conectar sua conta!</p>
          <button
            onClick={() => nav('/admin/powerbi')}
            className="inline-flex items-center gap-2 px-4 py-2 btn-gradient text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg">
            <ArrowLeft size={14} />
            Voltar para Configuração Power BI
          </button>
        </StepCard>

        {/* Troubleshooting */}
        <div className="bg-white border border-orbi-border rounded-xl p-5 mt-6 shadow-card">
          <h3 className="font-semibold mb-3 text-orbi-text">🔧 Problemas comuns</h3>
          <div className="space-y-3 text-xs text-orbi-textSecondary">
            <div>
              <p className="font-medium text-orbi-text">Erro "AADSTS50011" ao conectar</p>
              <p>A URI de redirecionamento não confere. Verifique se a URI registrada no Azure é exatamente:</p>
              <CodeBlock>{REDIRECT_URI}</CodeBlock>
            </div>
            <div>
              <p className="font-medium text-orbi-text">Erro "insufficient privileges"</p>
              <p>As permissões da API não foram aprovadas. Peça ao administrador do Azure AD para clicar em "Grant admin consent" na página de API Permissions.</p>
            </div>
            <div>
              <p className="font-medium text-orbi-text">Relatórios não aparecem / "Modo iframe"</p>
              <p>Isso pode acontecer se a conta conectada não tem licença Power BI Pro. Com licença Free, os relatórios funcionam em modo iframe (mais limitado). Para embed completo, é necessário Pro ou Premium.</p>
            </div>
            <div>
              <p className="font-medium text-orbi-text">Secret expirou</p>
              <p>O Client Secret tem validade (6, 12 ou 24 meses). Quando expirar, crie um novo em "Certificates & secrets" e atualize no Orbi.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
