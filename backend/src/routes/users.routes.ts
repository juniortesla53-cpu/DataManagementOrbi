import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import db from '../database';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, matricula, login_rede, nome_completo, cargo, cpf, site, role, ativo, created_at FROM users ORDER BY nome_completo').all();
  res.json(users);
});

router.post('/', (req, res) => {
  const { matricula, login_rede, nome_completo, cargo, cpf, site, senha, role } = req.body;
  if (!login_rede || !nome_completo || !senha) return res.status(400).json({ error: 'Campos obrigatórios: login_rede, nome_completo, senha' });
  try {
    const hash = bcryptjs.hashSync(senha, 10);
    const result = db.prepare('INSERT INTO users (matricula, login_rede, nome_completo, cargo, cpf, site, senha_hash, role) VALUES (?,?,?,?,?,?,?,?)').run(matricula, login_rede, nome_completo, cargo || null, cpf || null, site || null, hash, role || 'user');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Login ou matrícula já existe' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const { matricula, login_rede, nome_completo, cargo, cpf, site, senha, role, ativo } = req.body;
  const id = parseInt(req.params.id);
  try {
    if (senha) {
      const hash = bcryptjs.hashSync(senha, 10);
      db.prepare('UPDATE users SET matricula=?, login_rede=?, nome_completo=?, cargo=?, cpf=?, site=?, senha_hash=?, role=?, ativo=? WHERE id=?').run(matricula, login_rede, nome_completo, cargo, cpf, site, hash, role, ativo ?? 1, id);
    } else {
      db.prepare('UPDATE users SET matricula=?, login_rede=?, nome_completo=?, cargo=?, cpf=?, site=?, role=?, ativo=? WHERE id=?').run(matricula, login_rede, nome_completo, cargo, cpf, site, role, ativo ?? 1, id);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE users SET ativo = 0 WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;
