import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = 'srv-d9ad5epkh4rs73b5torg';

if (!API_KEY) {
  console.error('Set RENDER_API_KEY');
  process.exit(1);
}

const envPath = path.join(__dirname, '../backend/.env');
const local = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) local[m[1].trim()] = m[2].trim();
  });
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

const vars = [
  ['NODE_ENV', 'production'],
  ['JWT_SECRET', local.JWT_SECRET || `dm-${Date.now()}-${Math.random().toString(36).slice(2)}`],
  ['MONGODB_URI', local.MONGODB_URI],
  ['ADMIN_EMAIL', local.ADMIN_EMAIL || 'admin@dreammantra.in'],
  ['ADMIN_PASSWORD', local.ADMIN_PASSWORD || 'Unlocked.dreams@2000'],
  ['ADMIN_NAME', local.ADMIN_NAME || 'Dream Mantra Admin'],
  ['CORS_ORIGIN', 'https://dreammantra-crm.onrender.com'],
].filter(([, v]) => v);

for (const [key, value] of vars) {
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ envVar: { key, value } }),
  });
  const data = await res.json().catch(() => ({}));
  console.log(key, res.ok ? 'OK' : `FAIL ${res.status} ${data.message || ''}`);
}

const patch = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    serviceDetails: {
      envSpecificDetails: {
        buildCommand: 'npm install && npm run build',
        startCommand: 'npm start',
      },
      healthCheckPath: '/api/health',
    },
  }),
});
console.log('service patch', patch.ok ? 'OK' : `FAIL ${patch.status}`);

const deploy = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ clearCache: 'do_not_clear' }),
});
const deployData = await deploy.json().catch(() => ({}));
console.log('deploy', deploy.ok ? `OK id=${deployData.id}` : `FAIL ${deploy.status}`);
