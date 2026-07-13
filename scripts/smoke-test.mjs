const BASE = 'http://localhost:5001/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const login = await req('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@dreammantra.in', password: 'Admin@123' }),
});
if (!login.ok) {
  console.error('LOGIN FAIL', login.status, login.data);
  process.exit(1);
}
const token = login.data.token;
const h = { Authorization: `Bearer ${token}` };

const endpoints = [
  '/admin/dashboard',
  '/admin/leads',
  '/admin/partners',
  '/admin/students',
  '/admin/commissions',
  '/admin/reports',
  '/admin/users',
  '/admin/roles',
  '/admin/settings',
  '/admin/system',
  '/admin/follow-ups',
  '/admin/duplicates',
  '/admin/enterprise',
  '/admin/tasks',
  '/admin/payments',
  '/admin/payout-requests',
  '/admin/automations',
  '/admin/audit-log',
  '/admin/calendar',
  '/messages/inbox',
];

for (const ep of endpoints) {
  const r = await req(ep, { headers: h });
  console.log(r.ok ? 'OK ' : 'FAIL', ep, r.status, r.ok ? '' : JSON.stringify(r.data));
}
