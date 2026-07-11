import { useState } from 'react';
import { Trash2, Key, RefreshCw, Eye } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import Modal from '../Modal';
import { formatDate, formatCurrency, partnerTypeLabel, PARTNER_TYPES, PARTNER_TIERS } from '../../utils/constants';

export function PartnerRowActions({ partner, onEdit, onView, onDelete, onResetPwd, onRecalc }) {
  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" onClick={() => onView(partner)} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-blue-600" title="View"><Eye className="h-4 w-4" /></button>
      <button type="button" onClick={() => onEdit(partner)} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-gold-dark" title="Edit">Edit</button>
      <button type="button" onClick={() => onResetPwd(partner)} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-orange" title="Reset password"><Key className="h-3 w-3" /></button>
      <button type="button" onClick={() => onRecalc(partner)} className="rounded p-1 text-stone-400 hover:bg-stone-100" title="Recalc stats"><RefreshCw className="h-3 w-3" /></button>
      <button type="button" onClick={() => onDelete(partner)} className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

export function PartnerDetailModal({ partner, detail, open, onClose, onSave }) {
  const [form, setForm] = useState({});
  if (!open) return null;
  const p = detail?.partner || partner;
  const f = { ...p, ...form };

  return (
    <Modal open={open} onClose={onClose} title={`Partner: ${p?.name}`} wide>
      {detail && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatMini label="Total Leads" value={detail.stats?.totalLeads} />
            <StatMini label="Converted" value={detail.stats?.converted} />
            <StatMini label="Pending Commission" value={formatCurrency(detail.stats?.pendingCommission)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-xl border border-gold/20 bg-gold/5 p-3">
              <p className="text-xs font-semibold uppercase text-stone-500">Login Credentials</p>
              <p className="mt-1 font-mono text-lg font-bold text-gold-dark">{p.loginId || '—'}</p>
              <p className="text-sm text-stone-600">{p.email}</p>
              {p.partnerType === 'franchise' && (
                <p className="mt-2 text-sm text-orange">Franchise: {p.franchiseName} · {p.territory} · {p.franchiseCode}</p>
              )}
            </div>
            <Field label="Name" value={f.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Phone" value={f.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Organization" value={f.organization} onChange={(v) => setForm({ ...form, organization: v })} />
            <div><label className="dm-label">Tier</label><select className="dm-input" value={f.tier || 'bronze'} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{PARTNER_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="dm-label">Commission %</label><input type="number" className="dm-input" value={f.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} /></div>
            <div><label className="dm-label">Status</label><select className="dm-input" value={f.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['pending','active','suspended','rejected'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={!!f.documentsVerified} onChange={(e) => setForm({ ...form, documentsVerified: e.target.checked })} /> Documents verified</label>
          </div>

          <div className="rounded-xl bg-stone-50 p-4">
            <p className="mb-2 text-sm font-semibold text-stone-700">Payout Details</p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-stone-400">Bank:</span> {p.bankAccount || '—'}</p>
              <p><span className="text-stone-400">IFSC:</span> {p.ifsc || '—'}</p>
              <p><span className="text-stone-400">UPI:</span> {p.upiId || '—'}</p>
              <p><span className="text-stone-400">PAN:</span> {p.panNumber || '—'}</p>
              <p><span className="text-stone-400">Referral:</span> <code className="text-gold-dark">{p.referralCode}</code></p>
              <p><span className="text-stone-400">Earnings:</span> {formatCurrency(p.totalEarnings)}</p>
            </div>
          </div>

          {detail.leads?.length > 0 && (
            <div>
              <p className="mb-2 font-semibold text-stone-900">Recent Leads ({detail.leads.length})</p>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-100">
                {detail.leads.slice(0, 10).map((l) => (
                  <div key={l.id} className="flex justify-between border-b border-stone-50 px-3 py-2 text-sm">
                    <span>{l.studentName}</span>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={() => onSave(p.id, form)} className="dm-btn-primary w-full">Save Changes</button>
        </div>
      )}
    </Modal>
  );
}

function StatMini({ label, value }) {
  return <div className="rounded-xl bg-stone-50 p-3 text-center"><p className="text-xs text-stone-500">{label}</p><p className="font-bold text-stone-900">{value}</p></div>;
}

function Field({ label, value, onChange }) {
  return <div><label className="dm-label">{label}</label><input className="dm-input" value={value || ''} onChange={(e) => onChange(e.target.value)} /></div>;
}

export function BulkActionBar({ selected, onClear, actions }) {
  if (!selected.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
      <span className="text-sm font-semibold text-orange">{selected.length} selected</span>
      {actions.map((a) => (
        <button key={a.label} type="button" onClick={a.onClick} className={a.danger ? 'dm-btn-danger text-xs py-1' : 'dm-btn-ghost text-xs py-1'}>{a.label}</button>
      ))}
      <button type="button" onClick={onClear} className="ml-auto text-xs text-stone-500 hover:underline">Clear</button>
    </div>
  );
}

export function SelectCheckbox({ checked, onChange }) {
  return <input type="checkbox" checked={checked} onChange={onChange} className="rounded border-stone-300 text-orange focus:ring-orange" />;
}
