import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orbi-bg via-orbi-primary/30 to-orbi-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⬡</div>
          <h1 className="text-2xl font-bold text-orbi-accent">Orbi</h1>
          <p className="text-xs text-orbi-muted mt-1">Data Management</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-orbi-card border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          {error && <div className="mb-4 p-2 bg-orbi-danger/10 border border-orbi-danger/30 rounded-lg text-xs text-orbi-danger">{error}</div>}
          <div className="mb-4">
            <label className="block text-xs text-orbi-muted mb-1.5">Login de rede</label>
            <input type="text" value={login} onChange={(e) => setLogin(e.target.value)}
              className="w-full px-3 py-2 bg-orbi-bg border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-orbi-accent transition-colors" placeholder="seu.login" autoFocus />
          </div>
          <div className="mb-5">
            <label className="block text-xs text-orbi-muted mb-1.5">Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3 py-2 bg-orbi-bg border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-orbi-accent transition-colors" placeholder="••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-orbi-accent hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
