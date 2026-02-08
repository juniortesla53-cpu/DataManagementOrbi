import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface UserData {
  id: number;
  nome: string;
  login: string;
  role: string;
  matricula: string;
}

interface AuthCtx {
  user: UserData | null;
  login: (loginRede: string, senha: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('orbi_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (loginRede: string, senha: string) => {
    const { data } = await api.post('/auth/login', { login: loginRede, senha });
    localStorage.setItem('orbi_token', data.token);
    localStorage.setItem('orbi_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('orbi_token');
    localStorage.removeItem('orbi_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin', loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
