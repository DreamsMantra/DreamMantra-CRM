import express from 'express';
import cors from 'cors';
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

dotenv.config();

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

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));

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
app.use('/api/uploads', express.static(UPLOAD_DIR));

if (hasBuiltClient) {
  app.use(express.static(clientDist, { maxAge: '1d' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
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
