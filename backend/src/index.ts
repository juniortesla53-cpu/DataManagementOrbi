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
import powerbiRoutes from './routes/powerbi.routes';

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
app.use('/api/admin/powerbi', powerbiRoutes);

// Public embed endpoint (any authenticated user)
app.get('/api/reports/:id/embed', authMiddleware, async (req: any, res: any) => {
  const { getAccessToken } = require('./routes/powerbi.routes');
  const axiosLib = require('axios').default;
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND ativo = 1').get(parseInt(req.params.id)) as any;
  if (!report) return res.status(404).json({ error: 'Relatório não encontrado' });

  // Check permission
  if (req.user.role !== 'admin') {
    const perm = db.prepare('SELECT id FROM permissions WHERE user_id = ? AND report_id = ?').get(req.user.userId, report.id);
    if (!perm) return res.status(403).json({ error: 'Sem permissão' });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return res.json({ embedUrl: report.link_powerbi, fallback: true });

  const pbiUrl = report.link_powerbi;
  const groupMatch = pbiUrl.match(/groups\/([^/]+)/);
  const reportMatch = pbiUrl.match(/reports\/([^/]+)/);
  if (!reportMatch) return res.json({ embedUrl: pbiUrl, fallback: true });

  const pbiReportId = reportMatch[1];
  const groupId = groupMatch?.[1];
  const POWERBI_API = 'https://api.powerbi.com/v1.0/myorg';

  try {
    let embedUrl: string, embedToken: string;
    if (groupId && groupId !== 'me') {
      const info = await axiosLib.get(`${POWERBI_API}/groups/${groupId}/reports/${pbiReportId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      embedUrl = info.data.embedUrl;
      const tok = await axiosLib.post(`${POWERBI_API}/groups/${groupId}/reports/${pbiReportId}/GenerateToken`, { accessLevel: 'View' }, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
      embedToken = tok.data.token;
    } else {
      const info = await axiosLib.get(`${POWERBI_API}/reports/${pbiReportId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      embedUrl = info.data.embedUrl;
      const tok = await axiosLib.post(`${POWERBI_API}/reports/${pbiReportId}/GenerateToken`, { accessLevel: 'View' }, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
      embedToken = tok.data.token;
    }
    res.json({ embedUrl, embedToken, reportId: pbiReportId, fallback: false });
  } catch (err: any) {
    res.json({ embedUrl: pbiUrl, fallback: true, error: err.response?.data?.error?.message || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Orbi Backend running on port ${PORT}`);
});
