import { Router } from 'express';
import axios from 'axios';
import db from '../database';
import { authMiddleware } from '../auth';
import { getAccessToken } from './powerbi.routes';

const router = Router();

// Public embed endpoint (any authenticated user)
router.get('/:id/embed', authMiddleware, async (req: any, res) => {
  try {
    const reportId = parseInt(req.params.id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const report = db.prepare('SELECT * FROM reports WHERE id = ? AND ativo = 1').get(reportId) as any;
    
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Check permission
    if (req.user.role !== 'admin') {
      const perm = db.prepare('SELECT id FROM permissions WHERE user_id = ? AND report_id = ?').get(req.user.userId, report.id);
      if (!perm) {
        return res.status(403).json({ error: 'Sem permissão para acessar este relatório' });
      }
    }

    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return res.json({ embedUrl: report.link_powerbi, fallback: true });
    }

    const pbiUrl = report.link_powerbi;
    const groupMatch = pbiUrl.match(/groups\/([^/]+)/);
    const reportMatch = pbiUrl.match(/reports\/([^/]+)/);
    
    if (!reportMatch) {
      return res.json({ embedUrl: pbiUrl, fallback: true });
    }

    const pbiReportId = reportMatch[1];
    const groupId = groupMatch?.[1];
    const POWERBI_API = 'https://api.powerbi.com/v1.0/myorg';

    try {
      let embedUrl: string, embedToken: string;
      
      if (groupId && groupId !== 'me') {
        const info = await axios.get(`${POWERBI_API}/groups/${groupId}/reports/${pbiReportId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        embedUrl = info.data.embedUrl;
        
        const tok = await axios.post(
          `${POWERBI_API}/groups/${groupId}/reports/${pbiReportId}/GenerateToken`,
          { accessLevel: 'View' },
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        embedToken = tok.data.token;
      } else {
        const info = await axios.get(`${POWERBI_API}/reports/${pbiReportId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        embedUrl = info.data.embedUrl;
        
        const tok = await axios.post(
          `${POWERBI_API}/reports/${pbiReportId}/GenerateToken`,
          { accessLevel: 'View' },
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        embedToken = tok.data.token;
      }
      
      res.json({ embedUrl, embedToken, reportId: pbiReportId, fallback: false });
    } catch (err: any) {
      console.error('PowerBI API error:', err.response?.data || err.message);
      res.json({ 
        embedUrl: pbiUrl, 
        fallback: true, 
        error: err.response?.data?.error?.message || err.message 
      });
    }
  } catch (error: any) {
    console.error('Embed error:', error);
    res.status(500).json({ error: 'Erro ao gerar embed', details: error.message });
  }
});

export default router;
