import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import db from './database';
import authRoutes from './routes/auth.routes';
import reportsRoutes from './routes/reports.routes';
import usersRoutes from './routes/users.routes';
import permissionsRoutes from './routes/permissions.routes';
import { authMiddleware, adminMiddleware } from './auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initDatabase();

// Admin reports inline router
const adminReportsRouter = express.Router();
adminReportsRouter.use(authMiddleware, adminMiddleware);

adminReportsRouter.get('/', (req: any, res: any) => {
  res.json(db.prepare('SELECT * FROM reports ORDER BY nome').all());
});
adminReportsRouter.post('/', (req: any, res: any) => {
  const { nome, descricao, categoria, link_powerbi, thumbnail_url } = req.body;
  if (!nome || !link_powerbi) return res.status(400).json({ error: 'Nome e link são obrigatórios' });
  const result = db.prepare('INSERT INTO reports (nome, descricao, categoria, link_powerbi, thumbnail_url) VALUES (?,?,?,?,?)').run(nome, descricao||null, categoria||null, link_powerbi, thumbnail_url||null);
  res.status(201).json({ id: result.lastInsertRowid });
});
adminReportsRouter.put('/:id', (req: any, res: any) => {
  const { nome, descricao, categoria, link_powerbi, thumbnail_url, ativo } = req.body;
  db.prepare('UPDATE reports SET nome=?, descricao=?, categoria=?, link_powerbi=?, thumbnail_url=?, ativo=? WHERE id=?').run(nome, descricao, categoria, link_powerbi, thumbnail_url, ativo??1, parseInt(req.params.id));
  res.json({ success: true });
});
adminReportsRouter.delete('/:id', (req: any, res: any) => {
  db.prepare('UPDATE reports SET ativo = 0 WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/admin/reports', adminReportsRouter);
app.use('/api/admin/permissions', permissionsRoutes);

app.listen(PORT, () => {
  console.log(`Orbi Backend running on port ${PORT}`);
});
