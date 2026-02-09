import { Router } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';
import crypto from 'crypto';
import db from '../database';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware, adminMiddleware);

const ENCRYPT_KEY = process.env.ENCRYPT_KEY || 'orbi-encrypt-key-change-in-prod!'; // 32 chars
const POWERBI_API = 'https://api.powerbi.com/v1.0/myorg';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPT_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPT_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row?.value || null;
}

function setSetting(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function deleteSetting(key: string) {
  db.prepare('DELETE FROM settings WHERE key = ?').run(key);
}

function getMsalClient(): ConfidentialClientApplication | null {
  const clientId = getSetting('pbi_client_id');
  const clientSecret = getSetting('pbi_client_secret');
  const tenantId = getSetting('pbi_tenant_id');
  if (!clientId || !clientSecret || !tenantId) return null;

  return new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret: decrypt(clientSecret),
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });
}

// Get current Power BI connection status
router.get('/status', (req, res) => {
  const clientId = getSetting('pbi_client_id');
  const tenantId = getSetting('pbi_tenant_id');
  const refreshToken = getSetting('pbi_refresh_token');
  const connectedUser = getSetting('pbi_connected_user');
  const connectedAt = getSetting('pbi_connected_at');

  res.json({
    configured: !!(clientId && tenantId),
    connected: !!refreshToken,
    clientId: clientId || '',
    tenantId: tenantId || '',
    connectedUser: connectedUser || null,
    connectedAt: connectedAt || null,
  });
});

// Save Azure AD app configuration
router.post('/config', (req, res) => {
  const { clientId, clientSecret, tenantId } = req.body;
  if (!clientId || !clientSecret || !tenantId) {
    return res.status(400).json({ error: 'clientId, clientSecret e tenantId são obrigatórios' });
  }
  setSetting('pbi_client_id', clientId);
  setSetting('pbi_client_secret', encrypt(clientSecret));
  setSetting('pbi_tenant_id', tenantId);
  res.json({ success: true });
});

// Get Microsoft OAuth login URL
router.get('/auth-url', (req, res) => {
  const msalClient = getMsalClient();
  if (!msalClient) {
    return res.status(400).json({ error: 'Configure o Azure AD primeiro (clientId, clientSecret, tenantId)' });
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/api/admin/powerbi/callback`;
  setSetting('pbi_redirect_uri', redirectUri);

  msalClient.getAuthCodeUrl({
    scopes: ['https://analysis.windows.net/powerbi/api/.default', 'offline_access'],
    redirectUri,
    prompt: 'consent',
  }).then(url => {
    res.json({ url });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// OAuth callback - exchange code for tokens
router.get('/callback', async (req: any, res: any) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect('/admin/powerbi?error=' + encodeURIComponent(error as string));
  }
  if (!code) {
    return res.redirect('/admin/powerbi?error=no_code');
  }

  const msalClient = getMsalClient();
  if (!msalClient) {
    return res.redirect('/admin/powerbi?error=not_configured');
  }

  const redirectUri = getSetting('pbi_redirect_uri') || `${req.protocol}://${req.get('host')}/api/admin/powerbi/callback`;

  try {
    const tokenResponse = await msalClient.acquireTokenByCode({
      code: code as string,
      scopes: ['https://analysis.windows.net/powerbi/api/.default', 'offline_access'],
      redirectUri,
    });

    if (tokenResponse) {
      // Store access token and account info
      if (tokenResponse.accessToken) {
        setSetting('pbi_access_token', encrypt(tokenResponse.accessToken));
      }
      if (tokenResponse.expiresOn) {
        setSetting('pbi_token_expires', tokenResponse.expiresOn.toISOString());
      }
      // Store account for silent token refresh
      if (tokenResponse.account) {
        setSetting('pbi_account', JSON.stringify(tokenResponse.account));
        setSetting('pbi_connected_user', tokenResponse.account.username || tokenResponse.account.name || 'Unknown');
      }
      setSetting('pbi_connected_at', new Date().toISOString());

      // Try to get user info from Power BI
      try {
        const userInfo = await axios.get('https://api.powerbi.com/v1.0/myorg/groups', {
          headers: { Authorization: `Bearer ${tokenResponse.accessToken}` }
        });
        // Connection works!
      } catch (e) {
        // Token works for auth but maybe no groups access - still OK
      }
    }

    res.redirect('/admin/powerbi?success=true');
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    res.redirect('/admin/powerbi?error=' + encodeURIComponent(err.message || 'token_error'));
  }
});

// Disconnect - remove all tokens
router.post('/disconnect', (req, res) => {
  deleteSetting('pbi_access_token');
  deleteSetting('pbi_token_expires');
  deleteSetting('pbi_account');
  deleteSetting('pbi_connected_user');
  deleteSetting('pbi_connected_at');
  deleteSetting('pbi_redirect_uri');
  res.json({ success: true });
});

// Get a fresh access token (uses MSAL cache/silent refresh)
async function getAccessToken(): Promise<string | null> {
  const msalClient = getMsalClient();
  if (!msalClient) return null;

  const accountStr = getSetting('pbi_account');
  if (!accountStr) return null;

  // Check if current token is still valid
  const expiresStr = getSetting('pbi_token_expires');
  const encryptedToken = getSetting('pbi_access_token');
  if (encryptedToken && expiresStr) {
    const expires = new Date(expiresStr);
    if (expires > new Date(Date.now() + 5 * 60 * 1000)) { // 5 min buffer
      try {
        return decrypt(encryptedToken);
      } catch { /* token corrupted, try refresh */ }
    }
  }

  // Try silent token acquisition
  try {
    const account = JSON.parse(accountStr);
    const result = await msalClient.acquireTokenSilent({
      scopes: ['https://analysis.windows.net/powerbi/api/.default'],
      account,
    });
    if (result?.accessToken) {
      setSetting('pbi_access_token', encrypt(result.accessToken));
      if (result.expiresOn) {
        setSetting('pbi_token_expires', result.expiresOn.toISOString());
      }
      return result.accessToken;
    }
  } catch (err) {
    console.error('Silent token refresh failed:', err);
  }

  return null;
}

// Generate embed token for a report (called by non-admin users too)
router.get('/embed/:reportId', authMiddleware, async (req: any, res: any) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return res.status(401).json({ error: 'Power BI não conectado. Peça ao administrador para conectar.' });
  }

  // Get the report from our DB
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND ativo = 1').get(parseInt(req.params.reportId)) as any;
  if (!report) {
    return res.status(404).json({ error: 'Relatório não encontrado' });
  }

  // Parse the Power BI URL to extract groupId and reportId
  const pbiUrl = report.link_powerbi;
  const groupMatch = pbiUrl.match(/groups\/([^/]+)/);
  const reportMatch = pbiUrl.match(/reports\/([^/]+)/);

  if (!reportMatch) {
    // If we can't parse, just return the URL for iframe fallback
    return res.json({ embedUrl: pbiUrl, fallback: true });
  }

  const pbiReportId = reportMatch[1];
  const groupId = groupMatch?.[1];

  try {
    let embedUrl: string;
    let embedToken: string;

    if (groupId && groupId !== 'me') {
      // Report in a workspace/group
      const reportInfo = await axios.get(
        `${POWERBI_API}/groups/${groupId}/reports/${pbiReportId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      embedUrl = reportInfo.data.embedUrl;

      // Generate embed token
      const tokenResponse = await axios.post(
        `${POWERBI_API}/groups/${groupId}/reports/${pbiReportId}/GenerateToken`,
        { accessLevel: 'View' },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );
      embedToken = tokenResponse.data.token;
    } else {
      // Report in "My Workspace"
      const reportInfo = await axios.get(
        `${POWERBI_API}/reports/${pbiReportId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      embedUrl = reportInfo.data.embedUrl;

      const tokenResponse = await axios.post(
        `${POWERBI_API}/reports/${pbiReportId}/GenerateToken`,
        { accessLevel: 'View' },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );
      embedToken = tokenResponse.data.token;
    }

    res.json({
      embedUrl,
      embedToken,
      reportId: pbiReportId,
      fallback: false,
    });
  } catch (err: any) {
    console.error('Embed token error:', err.response?.data || err.message);
    // Fallback to iframe URL
    res.json({ embedUrl: pbiUrl, fallback: true, error: err.response?.data?.error?.message || err.message });
  }
});

// Test connection
router.get('/test', async (req, res) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return res.status(401).json({ error: 'Não conectado' });
  }

  try {
    const response = await axios.get(`${POWERBI_API}/groups`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    res.json({
      success: true,
      workspaces: response.data.value?.map((g: any) => ({ id: g.id, name: g.name })) || []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

export { getAccessToken };
export default router;
