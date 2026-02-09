import { Router } from 'express';
import db from '../database';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();

// All routes require admin authentication
router.use(authMiddleware, adminMiddleware);

router.get('/', (req, res) => {
  try {
    const reports = db.prepare('SELECT * FROM reports ORDER BY nome').all();
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao buscar relatórios', details: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { nome, descricao, categoria, link_powerbi, thumbnail_url } = req.body;
    
    if (!nome || !link_powerbi) {
      return res.status(400).json({ error: 'Nome e link são obrigatórios' });
    }
    
    const result = db.prepare(
      'INSERT INTO reports (nome, descricao, categoria, link_powerbi, thumbnail_url) VALUES (?, ?, ?, ?, ?)'
    ).run(nome, descricao || null, categoria || null, link_powerbi, thumbnail_url || null);
    
    res.status(201).json({ id: result.lastInsertRowid, success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao criar relatório', details: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { nome, descricao, categoria, link_powerbi, thumbnail_url, ativo } = req.body;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    db.prepare(
      'UPDATE reports SET nome = ?, descricao = ?, categoria = ?, link_powerbi = ?, thumbnail_url = ?, ativo = ? WHERE id = ?'
    ).run(nome, descricao, categoria, link_powerbi, thumbnail_url, ativo ?? 1, id);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar relatório', details: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    db.prepare('UPDATE reports SET ativo = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao desativar relatório', details: error.message });
  }
});

export default router;
