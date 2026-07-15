import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = 'srv-d9ad5epkh4rs73b5torg';

const envPath = path.join(__dirname, '../backend/.env');
const local = {};
const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
content.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eq = trimmed.indexOf('=');
  if (eq === -1) return;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (key) local[key] = value;
});

const envVars = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'JWT_SECRET', value: local.JWT_SECRET || `dm-${Date.now()}-${Math.random().toString(36).slice(2)}` },
  { key: 'MONGODB_URI', value: local.MONGODB_URI || '' },
  { key: 'ADMIN_EMAIL', value: local.ADMIN_EMAIL || 'admin@dreammantra.in' },
  { key: 'ADMIN_PASSWORD', value: local.ADMIN_PASSWORD || 'DreamMantra@2026' },
  { key: 'ADMIN_NAME', value: local.ADMIN_NAME || 'Dream Mantra Admin' },
  { key: 'CORS_ORIGIN', value: 'https://dreammantra-crm.onrender.com' },
].filter((v) => v.value);

const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(envVars),
});

console.log('PUT env-vars', res.status, res.ok ? 'OK' : await res.text());
