import { useState } from 'react';
import { Mail, X, Loader2, Check, XCircle } from 'lucide-react';
import api from '../../../api';

interface EnviarEmailModalProps {
  idCalculo: number;
  periodo: string;
  onClose: () => void;
}

type ExportFormat = 'csv' | 'xlsx' | 'txt';
type Delimiter = ';' | ',' | '|';

export default function EnviarEmailModal({ idCalculo, periodo, onClose }: EnviarEmailModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [formato, setFormato] = useState<ExportFormat>('csv');
  const [delimitador, setDelimitador] = useState<Delimiter>(';');
  const [assunto, setAssunto] = useState(`RV - Período ${periodo}`);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const adicionarEmail = () => {
    const email = emailInput.trim();
    if (!email) return;
    
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErro('Email inválido');
      return;
    }
    
    if (emails.includes(email)) {
      setErro('Email já adicionado');
      return;
    }
    
    setEmails([...emails, email]);
    setEmailInput('');
    setErro(null);
  };

  const removerEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarEmail();
    }
  };

  const enviar = async () => {
    if (emails.length === 0) {
      setErro('Adicione pelo menos um email');
      return;
    }

    if (!assunto.trim()) {
      setErro('Preencha o assunto');
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      await api.post(`/rv/calculos/${idCalculo}/enviar-email`, {
        emails,
        formato,
        delimitador: formato !== 'xlsx' ? delimitador : undefined,
        assunto: assunto.trim(),
        mensagem: mensagem.trim() || undefined
      });
      
      setSucesso(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao enviar email');
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal animate-scaleIn text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-nexus-text mb-2">Email Enviado com Sucesso!</h2>
          <p className="text-sm text-nexus-muted">
            O relatório de RV foi enviado para {emails.length} {emails.length === 1 ? 'destinatário' : 'destinatários'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-modal animate-scaleIn max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Mail size={20} className="text-nexus-purple" />
            <h2 className="font-bold text-nexus-text">Enviar RV por Email</h2>
          </div>
          <button onClick={onClose} className="text-nexus-muted hover:text-nexus-text">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Período */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-[10px] text-purple-700 font-semibold mb-1">PERÍODO DO CÁLCULO</p>
            <p className="text-sm font-bold text-nexus-purple">{periodo}</p>
          </div>

          {/* Lista de emails */}
          <div>
            <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">
              Destinatários
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o email e pressione Enter"
                className="flex-1 px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs"
              />
              <button
                onClick={adicionarEmail}
                className="px-4 py-2 bg-nexus-purple text-white rounded-lg text-xs font-semibold hover:bg-nexus-purpleDark transition-colors"
              >
                Adicionar
              </button>
            </div>
            
            {/* Tags de emails */}
            {emails.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {emails.map(email => (
                  <div key={email} className="flex items-center gap-1 bg-purple-100 text-nexus-purple px-3 py-1 rounded-full text-xs">
                    <span>{email}</span>
                    <button onClick={() => removerEmail(email)} className="hover:text-nexus-purpleDark">
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-nexus-muted mt-1">
              {emails.length} {emails.length === 1 ? 'destinatário' : 'destinatários'}
            </p>
          </div>

          {/* Formato do anexo */}
          <div>
            <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">
              Formato do Anexo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['csv', 'xlsx', 'txt'] as ExportFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setFormato(fmt)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    formato === fmt
                      ? 'bg-nexus-purple text-white'
                      : 'bg-nexus-bg text-nexus-text hover:bg-nexus-borderLight'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Delimitador - apenas para CSV e TXT */}
          {formato !== 'xlsx' && (
            <div>
              <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">
                Delimitador
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: ';', label: 'Ponto e vírgula (;)' },
                  { value: ',', label: 'Vírgula (,)' },
                  { value: '|', label: 'Pipe (|)' }
                ].map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDelimitador(d.value as Delimiter)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      delimitador === d.value
                        ? 'bg-nexus-purple text-white'
                        : 'bg-nexus-bg text-nexus-text hover:bg-nexus-borderLight'
                    }`}
                  >
                    {d.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assunto */}
          <div>
            <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">
              Assunto do Email
            </label>
            <input
              type="text"
              value={assunto}
              onChange={e => setAssunto(e.target.value)}
              className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs"
              placeholder="Assunto do email"
            />
          </div>

          {/* Mensagem opcional */}
          <div>
            <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">
              Mensagem (opcional)
            </label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-nexus-bg border border-nexus-border rounded-lg text-xs resize-none"
              placeholder="Adicione uma mensagem personalizada..."
            />
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{erro}</p>
            </div>
          )}
        </div>

        {/* Botão enviar */}
        <button
          onClick={enviar}
          disabled={enviando || emails.length === 0}
          className="mt-5 w-full py-2.5 btn-gradient rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {enviando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail size={16} />
              Enviar Email
            </>
          )}
        </button>
      </div>
    </div>
  );
}
