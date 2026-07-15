import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, KeyRound, MessageSquare, Save, Plus, IndianRupee, FolderOpen, Package,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import SectionBlock from '../../components/layout/SectionBlock';
import { partnerTypeLabel, formatCurrency, formatDate } from '../../utils/constants';
import { leadDisplayName, leadLifecycleLabel } from '../../config/adminTabs';
import { api } from '../../api';
import { PARTNER_TIERS } from '../../utils/constants';

/**
 * Full-page partner profile — leads, resources, product rates, earnings.
 * Deep link: ?tab=partners&partnerId=…
 */
export default function PartnerProfilePage({
  partnerId, onBack, onOpenLead, onMessage, flash, fail, resetPassword,
}) {
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [commissionForm, setCommissionForm] = useState({ leadId: '', amount: '', notes: '' });
  const [rateDrafts, setRateDrafts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.admin.getPartner(partnerId);
      setDetail(d);
      setForm({
        name: d.partner?.name || '',
        phone: d.partner?.phone || '',
        organization: d.partner?.organization || '',
        tier: d.partner?.tier || 'bronze',
        status: d.partner?.status || 'pending',
        documentsVerified: !!d.partner?.documentsVerified,
        city: d.partner?.city || '',
        notes: d.partner?.notes || '',
      });
      const drafts = {};
      (d.productRates || []).forEach((r) => {
        drafts[r.productId] = {
          salePrice: r.salePrice,
          commissionType: r.commission?.type || 'fixed',
          commissionValue: r.commission?.value ?? 0,
        };
      });
      setRateDrafts(drafts);
    } catch (err) {
      fail?.(err);
    } finally {
      setLoading(false);
    }
  }, [partnerId, fail]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    try {
      await api.admin.updatePartner(partnerId, form);
      flash?.('Partner updated');
      load();
    } catch (err) { fail?.(err); }
  };

  const saveRate = async (productId) => {
    const d = rateDrafts[productId];
    if (!d) return;
    try {
      await api.admin.upsertProductRateOverride({
        scope: 'partner',
        entityId: partnerId,
        productId,
        salePrice: Number(d.salePrice),
        listPrice: Number(d.salePrice),
        commission: { type: d.commissionType, value: Number(d.commissionValue) },
      });
      flash?.('Product rate saved for this partner');
      load();
    } catch (err) { fail?.(err); }
  };

  const addCommission = async (e) => {
    e.preventDefault();
    try {
      await api.admin.createCommission({
        partnerId,
        leadId: commissionForm.leadId || undefined,
        amount: Number(commissionForm.amount),
        notes: commissionForm.notes,
        status: 'pending',
      });
      flash?.('Commission added');
      setCommissionForm({ leadId: '', amount: '', notes: '' });
      load();
    } catch (err) { fail?.(err); }
  };

  const updateCommissionStatus = async (id, status) => {
    try {
      await api.admin.updateCommission(id, { status });
      flash?.(`Commission ${status}`);
      load();
    } catch (err) { fail?.(err); }
  };

  if (loading) {
    return <div className="dm-card p-12 text-center text-stone-400">Loading partner…</div>;
  }
  if (!detail?.partner) {
    return (
      <div className="dm-card p-12 text-center">
        <p className="text-stone-600">Partner not found.</p>
        <button type="button" className="dm-btn-primary mt-4" onClick={onBack}>Back</button>
      </div>
    );
  }

  const p = detail.partner;
  const leads = detail.leads || [];
  const commissions = detail.commissions || [];
  const resources = detail.resources || [];
  const productRates = detail.productRates || [];
  const payouts = detail.payouts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-orange">
            <ArrowLeft className="h-4 w-4" /> Back to Partners
          </button>
          <h2 className="font-display text-2xl font-bold text-stone-900">{p.name}</h2>
          <p className="font-mono text-sm font-semibold text-gold-dark">{p.loginId || '—'}</p>
          <p className="text-sm text-stone-500">{partnerTypeLabel(p.partnerType)} · {p.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="dm-btn-ghost text-sm" onClick={() => onMessage?.(p)}>
            <MessageSquare className="h-4 w-4" /> Message
          </button>
          <button type="button" className="dm-btn-ghost text-sm" onClick={() => resetPassword?.(p)}>
            <KeyRound className="h-4 w-4" /> Reset Password
          </button>
          <button type="button" className="dm-btn-primary text-sm" onClick={saveProfile}>
            <Save className="h-4 w-4" /> Save Profile
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Leads" value={detail.stats?.totalLeads ?? 0} />
        <Stat label="Converted" value={detail.stats?.converted ?? 0} />
        <Stat label="Pending Commission" value={formatCurrency(detail.stats?.pendingCommission)} />
        <Stat label="Paid / Earnings" value={formatCurrency(detail.stats?.paidCommission ?? p.totalEarnings)} />
      </div>

      <SectionBlock title="Profile & KYC">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Organization" value={form.organization} onChange={(v) => setForm({ ...form, organization: v })} />
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <div>
            <label className="dm-label">Tier</label>
            <select className="dm-input" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
              {PARTNER_TIERS.map((t) => <option key={t.value || t} value={t.value || t}>{t.label || t}</option>)}
            </select>
          </div>
          <div>
            <label className="dm-label">Status</label>
            <select className="dm-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['pending', 'active', 'suspended', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={!!form.documentsVerified} onChange={(e) => setForm({ ...form, documentsVerified: e.target.checked })} />
            Documents verified
          </label>
        </div>
        <div className="mt-4 grid gap-2 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-2">
          <p><span className="text-stone-400">Bank:</span> {p.bankAccount || '—'}</p>
          <p><span className="text-stone-400">IFSC:</span> {p.ifsc || '—'}</p>
          <p><span className="text-stone-400">UPI:</span> {p.upiId || '—'}</p>
          <p><span className="text-stone-400">PAN:</span> {p.panNumber || '—'}</p>
          <p><span className="text-stone-400">Referral:</span> <code className="text-gold-dark">{p.referralCode || '—'}</code></p>
        </div>
      </SectionBlock>

      <SectionBlock title="Leads given" description={`${leads.length} lead(s) from this partner`}>
        <div className="dm-card overflow-x-auto">
          <table className="dm-table w-full">
            <thead>
              <tr>
                <th>Lead ID</th><th>Name</th><th>Type</th><th>Status</th><th>Products</th><th>Value</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-stone-400">No leads yet</td></tr>
              )}
              {leads.map((l) => (
                <tr key={l.id} className="cursor-pointer" onClick={() => onOpenLead?.(l)}>
                  <td className="font-mono text-xs font-semibold">{l.leadId}</td>
                  <td className="font-medium text-orange hover:underline">{leadDisplayName(l)}</td>
                  <td><span className="dm-badge text-xs">{leadLifecycleLabel(l)}</span></td>
                  <td><StatusBadge status={l.status} /></td>
                  <td className="max-w-[10rem] truncate text-xs">{(l.interestedIn || []).join(', ') || '—'}</td>
                  <td>{formatCurrency(l.dealValue || l.expectedValue || l.commissionAmount)}</td>
                  <td className="text-xs text-stone-500">{formatDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBlock>

      <SectionBlock title="Products & rates" description="Catalogue defaults with partner-specific overrides (no fixed partner %). Super Admin & Sales can change per product.">
        <div className="space-y-3">
          {productRates.map((r) => {
            const d = rateDrafts[r.productId] || {};
            return (
              <div key={r.productId} className="grid items-end gap-3 rounded-xl border border-stone-100 p-3 sm:grid-cols-5">
                <div className="sm:col-span-1">
                  <p className="flex items-center gap-1 text-sm font-semibold"><Package className="h-3.5 w-3.5" /> {r.label}</p>
                  <p className="text-xs text-stone-400">Catalogue ₹{r.cataloguePrice}
                    {r.hasOverride ? ' · overridden' : ''}
                  </p>
                </div>
                <div>
                  <label className="dm-label">Sale price</label>
                  <input type="number" className="dm-input" value={d.salePrice ?? ''} onChange={(e) => setRateDrafts({ ...rateDrafts, [r.productId]: { ...d, salePrice: e.target.value } })} />
                </div>
                <div>
                  <label className="dm-label">Commission type</label>
                  <select className="dm-input" value={d.commissionType || 'fixed'} onChange={(e) => setRateDrafts({ ...rateDrafts, [r.productId]: { ...d, commissionType: e.target.value } })}>
                    <option value="fixed">Fixed ₹</option>
                    <option value="percentage">Percentage %</option>
                  </select>
                </div>
                <div>
                  <label className="dm-label">Commission value</label>
                  <input type="number" className="dm-input" value={d.commissionValue ?? ''} onChange={(e) => setRateDrafts({ ...rateDrafts, [r.productId]: { ...d, commissionValue: e.target.value } })} />
                </div>
                <button type="button" className="dm-btn-ghost text-sm" onClick={() => saveRate(r.productId)}>Save rate</button>
              </div>
            );
          })}
          {!productRates.length && <p className="text-sm text-stone-400">No products in catalogue.</p>}
        </div>
      </SectionBlock>

      <SectionBlock title="Resources shared" description="Training, marketing and product links for this partner">
        <div className="space-y-2">
          {resources.map((r) => (
            <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-stone-100 px-3 py-2 text-sm hover:bg-stone-50">
              <FolderOpen className="h-4 w-4 text-gold-dark" />
              <span className="font-medium">{r.title}</span>
              <span className="text-xs capitalize text-stone-400">{r.category} · {r.partnerId === 'all' ? 'all partners' : 'private'}</span>
            </a>
          ))}
          {!resources.length && <p className="text-sm text-stone-400">No resources shared yet. Use Partners → Resources to add.</p>}
        </div>
      </SectionBlock>

      <SectionBlock title="Money & commissions">
        <form onSubmit={addCommission} className="mb-4 grid gap-3 rounded-xl border border-orange/20 bg-orange/5 p-4 sm:grid-cols-4">
          <div>
            <label className="dm-label">Lead (optional)</label>
            <select className="dm-input" value={commissionForm.leadId} onChange={(e) => setCommissionForm({ ...commissionForm, leadId: e.target.value })}>
              <option value="">—</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.leadId} — {leadDisplayName(l)}</option>)}
            </select>
          </div>
          <div>
            <label className="dm-label">Amount ₹</label>
            <input type="number" className="dm-input" required value={commissionForm.amount} onChange={(e) => setCommissionForm({ ...commissionForm, amount: e.target.value })} />
          </div>
          <div>
            <label className="dm-label">Notes</label>
            <input className="dm-input" value={commissionForm.notes} onChange={(e) => setCommissionForm({ ...commissionForm, notes: e.target.value })} />
          </div>
          <button type="submit" className="dm-btn-primary self-end text-sm"><Plus className="h-4 w-4" /> Add Commission</button>
        </form>
        <div className="dm-card overflow-x-auto">
          <table className="dm-table w-full">
            <thead>
              <tr><th>Date</th><th>Lead</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id}>
                  <td className="text-xs">{formatDate(c.createdAt)}</td>
                  <td className="font-mono text-xs">{c.lead?.leadId || c.leadId || '—'}</td>
                  <td className="font-semibold">{formatCurrency(c.amount)}</td>
                  <td><span className="dm-badge capitalize text-xs">{c.status}</span></td>
                  <td className="space-x-2 text-xs">
                    {c.status === 'pending' && <button type="button" className="text-emerald-600" onClick={() => updateCommissionStatus(c.id, 'approved')}>Approve</button>}
                    {(c.status === 'pending' || c.status === 'approved') && <button type="button" className="text-gold-dark" onClick={() => updateCommissionStatus(c.id, 'paid')}>Mark paid</button>}
                  </td>
                </tr>
              ))}
              {!commissions.length && <tr><td colSpan={5} className="py-6 text-center text-stone-400">No commissions yet</td></tr>}
            </tbody>
          </table>
        </div>
        {payouts.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1 text-sm font-semibold"><IndianRupee className="h-4 w-4" /> Payout requests</p>
            <ul className="space-y-1 text-sm">
              {payouts.map((req) => (
                <li key={req.id} className="flex justify-between rounded-lg bg-stone-50 px-3 py-2">
                  <span>{formatCurrency(req.amount)} · {req.status}</span>
                  <span className="text-xs text-stone-400">{formatDate(req.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionBlock>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-white p-4 text-center shadow-sm">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-stone-900">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="dm-label">{label}</label>
      <input className="dm-input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
