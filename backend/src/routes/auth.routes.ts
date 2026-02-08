import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import db from '../database';
import { generateToken } from '../auth';
import { authMiddleware } from '../auth';
import { User } from '../types';

const router = Router();

router.post('/login', (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) return res.status(400).json({ error: 'Login e senha são obrigatórios' });

  const user = db.prepare('SELECT * FROM users WHERE login_rede = ? AND ativo = 1').get(login) as User | undefined;
  if (!user || !bcryptjs.compareSync(senha, user.senha_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = generateToken({ userId: user.id, role: user.role, loginRede: user.login_rede });
  res.json({
    token,
    user: { id: user.id, nome: user.nome_completo, login: user.login_rede, role: user.role, matricula: user.matricula }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, matricula, login_rede, nome_completo, cargo, site, role FROM users WHERE id = ?').get((req as any).user.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
});

export default router;
