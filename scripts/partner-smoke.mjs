const BASE = 'http://localhost:5001/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Partner smoke (find first active partner or skip)
const adminLogin = await req('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@dreammantra.in', password: 'Admin@123' }),
});
const adminH = { Authorization: `Bearer ${adminLogin.data.token}` };
const partners = await req('/admin/partners?status=active', { headers: adminH });
const p = partners.data.partners?.[0];
if (!p) {
  console.log('SKIP partner tests — no active partners');
  process.exit(0);
}

// Try partner login by email if we know password pattern
const partnerLogin = await req('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: p.email, password: 'Partner@123' }),
});
if (!partnerLogin.ok) {
  console.log('SKIP partner tests — cannot login as', p.email, partnerLogin.status);
  process.exit(0);
}
const ph = { Authorization: `Bearer ${partnerLogin.data.token}` };
for (const ep of ['/partner/dashboard', '/partner/leads', '/partner/commissions', '/partner/follow-ups', '/partner/notifications']) {
  const r = await req(ep, { headers: ph });
  console.log(r.ok ? 'OK ' : 'FAIL', ep, r.status);
}
