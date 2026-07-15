import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase, getDbStatus, getStorageInfo, shutdownDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import partnerRoutes from './routes/partner.js';
import adminRoutes from './routes/admin.js';
import staffRoutes from './routes/staff.js';
import messagesRoutes from './routes/messages.js';
import { UPLOAD_DIR } from './lib/upload.js';
import { applySecurity, sanitizeInput } from './middleware/security.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-me')) {
  console.error('✗ JWT_SECRET must be set to a strong value in production');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '../client/dist');
const hasBuiltClient = fs.existsSync(path.join(clientDist, 'index.html'));

const app = express();
const PORT = process.env.PORT || 5001;

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : process.env.NODE_ENV === 'production'
    ? true
    : ['http://localhost:5174', 'http://127.0.0.1:5174'];

applySecurity(app);
app.use(compression({ threshold: 1024 }));
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);

app.get('/api/health', (_req, res) => {
  const storage = getStorageInfo();
  res.json({
    ok: true,
    db: getDbStatus(),
    storage: storage.mode,
    mongo: storage.mongo,
    ts: Date.now(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', etag: true }));

if (hasBuiltClient) {
  app.use('/assets', express.static(path.join(clientDist, 'assets'), {
    maxAge: '1y',
    immutable: true,
    etag: true,
  }));
  app.use(express.static(clientDist, { maxAge: '1h', etag: true, index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function start() {
  await initDatabase();
  const { mode, mongo } = getStorageInfo();
  console.log(`✓ Database ready (${mode}${mongo !== 'not_configured' ? ` · ${mongo}` : ''})`);
  const server = app.listen(PORT, () => {
    console.log(`Cream Mantra CRM API running on http://localhost:${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n✗ Port ${PORT} is already in use. Stop the other process or set PORT in .env\n`);
      process.exit(1);
    }
    throw err;
  });
}

process.on('SIGINT', async () => {
  await shutdownDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownDatabase();
  process.exit(0);
});

start();
