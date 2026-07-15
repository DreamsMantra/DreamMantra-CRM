const BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const login = await req('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@dreammantra.in', password: 'Unlocked.dreams@2000' }),
});
if (!login.ok) {
  console.error('LOGIN FAIL', login.status, login.data);
  process.exit(1);
}
const h = { Authorization: `Bearer ${login.data.token}` };
console.log('OK login');

const endpoints = [
  '/health',
  '/admin/dashboard',
  '/admin/follow-ups',
  '/admin/leads',
  '/admin/partners',
  '/admin/commissions',
];
for (const ep of endpoints) {
  const r = await req(ep === '/health' ? '/health' : ep, ep === '/health' ? {} : { headers: h });
  const path = ep === '/health' ? '/health' : ep;
  console.log(r.ok ? 'OK ' : 'FAIL', path, r.status, ep === '/admin/follow-ups' ? `overdue=${r.data.overdue?.length}` : '');
}

// compression check via content-encoding if available
const raw = await fetch(`${BASE}/admin/dashboard`, { headers: h });
console.log('encoding', raw.headers.get('content-encoding') || 'none', 'bytes', (await raw.arrayBuffer()).byteLength);
