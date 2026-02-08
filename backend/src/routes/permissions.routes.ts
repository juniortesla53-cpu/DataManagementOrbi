import { Router } from 'express';
import db from '../database';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/', (req, res) => {
  const perms = db.prepare(`
    SELECT p.id, p.user_id, p.report_id, u.nome_completo as user_nome, u.login_rede, r.nome as report_nome
    FROM permissions p
    JOIN users u ON u.id = p.user_id
    JOIN reports r ON r.id = p.report_id
    ORDER BY u.nome_completo, r.nome
  `).all();
  res.json(perms);
});

router.get('/report/:reportId', (req, res) => {
  const perms = db.prepare(`
    SELECT p.id, u.id as user_id, u.nome_completo, u.login_rede
    FROM permissions p JOIN users u ON u.id = p.user_id
    WHERE p.report_id = ?
  `).all(parseInt(req.params.reportId));
  res.json(perms);
});

router.get('/user/:userId', (req, res) => {
  const perms = db.prepare(`
    SELECT p.id, r.id as report_id, r.nome, r.categoria
    FROM permissions p JOIN reports r ON r.id = p.report_id
    WHERE p.user_id = ?
  `).all(parseInt(req.params.userId));
  res.json(perms);
});

router.post('/', (req, res) => {
  const { user_id, report_id } = req.body;
  try {
    const result = db.prepare('INSERT INTO permissions (user_id, report_id) VALUES (?, ?)').run(user_id, report_id);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Permissão já existe' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM permissions WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;
