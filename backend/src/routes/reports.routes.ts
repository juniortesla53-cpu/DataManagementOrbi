import { Router } from 'express';
import db from '../database';
import { authMiddleware } from '../auth';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const user = (req as any).user;
  let reports;
  if (user.role === 'admin') {
    reports = db.prepare('SELECT * FROM reports WHERE ativo = 1 ORDER BY nome').all();
  } else {
    reports = db.prepare(`
      SELECT r.* FROM reports r
      INNER JOIN permissions p ON p.report_id = r.id
      WHERE p.user_id = ? AND r.ativo = 1
      ORDER BY r.nome
    `).all(user.userId);
  }
  res.json(reports);
});

router.get('/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const id = parseInt(req.params.id);
  let report;
  if (user.role === 'admin') {
    report = db.prepare('SELECT * FROM reports WHERE id = ? AND ativo = 1').get(id);
  } else {
    report = db.prepare(`
      SELECT r.* FROM reports r
      INNER JOIN permissions p ON p.report_id = r.id
      WHERE r.id = ? AND p.user_id = ? AND r.ativo = 1
    `).get(id, user.userId);
  }
  if (!report) return res.status(404).json({ error: 'Relatório não encontrado' });
  res.json(report);
});

export default router;
