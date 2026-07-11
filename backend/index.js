import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase, getDbStatus } from './db.js';
import authRoutes from './routes/auth.js';
import partnerRoutes from './routes/partner.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '../client/dist');
const hasBuiltClient = fs.existsSync(path.join(clientDist, 'index.html'));

const app = express();
const PORT = process.env.PORT || 5001;

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5174', 'http://127.0.0.1:5174'];

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: getDbStatus(), storage: 'json-file', ts: Date.now() });
});

app.use('/api/auth', authRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/admin', adminRoutes);

if (hasBuiltClient) {
  app.use(express.static(clientDist, { maxAge: '1d' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function start() {
  await initDatabase();
  console.log('✓ JSON file database ready');
  app.listen(PORT, () => {
    console.log(`Cream Mantra CRM API running on http://localhost:${PORT}`);
  });
}

start();
