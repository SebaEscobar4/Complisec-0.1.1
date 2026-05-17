import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import onboardingRoutes from './routes/onboarding.js';
import assetRoutes from './routes/assets.js';
import riskRoutes from './routes/risks.js';
import soaRoutes from './routes/soa.js';
import authRoutes from './routes/auth.js';
import evidenceRoutes from './routes/evidences.js';
import diagnosticRoutes from './routes/diagnostic.js';
import auditRoutes      from './routes/audits.js';
import { seedControls } from './scripts/seedControls.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rutas
app.use('/api/auth',       authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/assets',     assetRoutes);
app.use('/api/risks',      riskRoutes);
app.use('/api/soa',        soaRoutes);
app.use('/api/evidences',  evidenceRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/audits',     auditRoutes);  // ← nuevo

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(port, async () => {
  console.log(`CompliSec BFF listening on port ${port}`);
  await seedControls();
});