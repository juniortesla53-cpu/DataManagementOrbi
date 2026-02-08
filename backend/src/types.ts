export interface User {
  id: number;
  matricula: string | null;
  login_rede: string;
  nome_completo: string;
  cargo: string | null;
  cpf: string | null;
  site: string | null;
  senha_hash: string;
  role: 'admin' | 'user';
  ativo: number;
  created_at: string;
}

export interface Report {
  id: number;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  link_powerbi: string;
  thumbnail_url: string | null;
  ativo: number;
  created_at: string;
}

export interface Permission {
  id: number;
  user_id: number;
  report_id: number;
}

export interface JwtPayload {
  userId: number;
  role: string;
  loginRede: string;
}
