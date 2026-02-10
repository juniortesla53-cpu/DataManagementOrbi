import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: doLogin } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await doLogin(login, senha);
      nav('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-animated relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md px-6 relative z-10 animate-fadeIn">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 mb-4 shadow-glow">
            <span className="text-3xl font-bold text-white">O</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Orbi</h1>
          <p className="text-white/60 text-sm mt-1">Data Management Platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-modal">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 animate-fadeIn">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-medium text-orbi-text mb-1.5">Login de rede</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full px-4 py-3 bg-orbi-bg border border-orbi-border rounded-xl text-sm placeholder:text-orbi-muted transition-all"
              placeholder="seu.login"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-orbi-text mb-1.5">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 bg-orbi-bg border border-orbi-border rounded-xl text-sm placeholder:text-orbi-muted transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-white/40 mt-6">
          Use suas credenciais de rede para acessar
        </p>
      </div>
    </div>
  );
}
