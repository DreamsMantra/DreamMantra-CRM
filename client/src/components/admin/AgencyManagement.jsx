import { useEffect, useState } from 'react';
import { Building2, MapPin, Target, IndianRupee } from 'lucide-react';
import { api } from '../../api';
import { agencyTierMeta, formatCurrency } from '../../utils/constants';
import AdminPageHeader, { EditButton } from './AdminPageHeader';
import Modal from '../Modal';

const EMPTY_AGENCY = {
  agencyName: '', territory: '', outletCount: 1, investmentTier: 'starter',
  operatingModel: 'single_outlet', royaltyPercent: 8, status: 'active', commissionRate: 15, tier: 'gold',
};

export default function AgencyManagement({ onEdit, onAdd }) {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_AGENCY);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    api.admin.agencies().then((d) => setAgencies(d.agencies || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = (a) => {
    if (onEdit) { onEdit(a); return; }
    setEditingId(a.id);
    setEditForm({
      agencyName: a.agencyName || a.franchiseName || a.name || '',
      territory: a.territory || '',
      outletCount: a.outletCount || 1,
      investmentTier: a.investmentTier || 'starter',
      operatingModel: a.operatingModel || 'single_outlet',
      royaltyPercent: a.royaltyPercent ?? 8,
      status: a.status || 'active',
      commissionRate: a.commissionRate ?? 15,
      tier: a.tier || 'gold',
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.admin.updatePartner(editingId, editForm);
    setMsg('Agency updated successfully');
    setEditModal(false);
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) return <div className="dm-card p-8 text-center text-stone-400">Loading agencies...</div>;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Agency Network"
        subtitle={`${agencies.length} agency partners across territories`}
        onRefresh={load}
        onAdd={onAdd}
        addLabel="Add Agency"
      />
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agencies.map((a) => {
          const tier = agencyTierMeta(a.investmentTier);
          return (
            <div key={a.id} className="dm-card p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="dm-badge bg-gold/15 text-gold-dark text-xs">Agency</span>
                  <h3 className="mt-2 font-semibold text-stone-900">{a.agencyName || a.franchiseName || a.name}</h3>
                  <p className="text-xs text-stone-500 font-mono">{a.agencyCode || a.franchiseCode}</p>
                </div>
                <span className={`dm-badge text-xs ${a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
              </div>
              <p className="mt-2 flex items-center gap-1 text-sm text-stone-600"><MapPin className="h-3 w-3" /> {a.territory || a.city || '—'}</p>
              <p className="text-xs text-stone-500">{tier.label} · {a.outletCount || 1} centre(s)</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-stone-50 p-2"><Target className="h-3 w-3 mx-auto text-orange" /><p className="font-bold mt-1">{a.stats?.totalLeads || 0}</p><p className="text-stone-500">Leads</p></div>
                <div className="rounded-lg bg-stone-50 p-2"><Building2 className="h-3 w-3 mx-auto text-blue-500" /><p className="font-bold mt-1">{a.stats?.conversionRate || 0}%</p><p className="text-stone-500">Conv.</p></div>
                <div className="rounded-lg bg-stone-50 p-2"><IndianRupee className="h-3 w-3 mx-auto text-gold-dark" /><p className="font-bold mt-1">{formatCurrency(a.stats?.totalEarnings || 0)}</p><p className="text-stone-500">Paid</p></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-stone-500 mb-1"><span>Onboarding</span><span>{a.stats?.onboardingProgress || 0}%</span></div>
                <div className="h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full bg-gold" style={{ width: `${a.stats?.onboardingProgress || 0}%` }} /></div>
              </div>
              <div className="mt-3 flex gap-2">
                <EditButton onClick={() => openEdit(a)} label="Update Agency" />
              </div>
            </div>
          );
        })}
        {!agencies.length && (
          <div className="dm-card col-span-full p-12 text-center text-stone-400">
            No agency partners yet. Click &quot;Add Agency&quot; to create one.
          </div>
        )}
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Update Agency">
        <form onSubmit={saveEdit} className="space-y-3">
          <div><label className="dm-label">Agency Name</label><input className="dm-input" value={editForm.agencyName} onChange={(e) => setEditForm({ ...editForm, agencyName: e.target.value })} required /></div>
          <div><label className="dm-label">Territory</label><input className="dm-input" value={editForm.territory} onChange={(e) => setEditForm({ ...editForm, territory: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="dm-label">Centres</label><input type="number" min={1} className="dm-input" value={editForm.outletCount} onChange={(e) => setEditForm({ ...editForm, outletCount: Number(e.target.value) })} /></div>
            <div><label className="dm-label">Royalty %</label><input type="number" className="dm-input" value={editForm.royaltyPercent} onChange={(e) => setEditForm({ ...editForm, royaltyPercent: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="dm-label">Commission %</label><input type="number" className="dm-input" value={editForm.commissionRate} onChange={(e) => setEditForm({ ...editForm, commissionRate: Number(e.target.value) })} /></div>
            <div><label className="dm-label">Status</label>
              <select className="dm-input" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {['active', 'pending', 'suspended'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="dm-btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
    </div>
  );
}
