import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database';

// Routes
import authRoutes from './routes/auth.routes';
import reportsRoutes from './routes/reports.routes';
import usersRoutes from './routes/users.routes';
import permissionsRoutes from './routes/permissions.routes';
import powerbiRoutes from './routes/powerbi.routes';
import adminReportsRoutes from './routes/admin-reports.routes';
import embedRoutes from './routes/embed.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/admin/permissions', permissionsRoutes);
app.use('/api/admin/powerbi', powerbiRoutes);
app.use('/api/reports', embedRoutes); // Embed endpoint at /api/reports/:id/embed

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Nexus BI Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
