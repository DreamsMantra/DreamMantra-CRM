import { useState } from 'react';
import { UserPlus, Search, Store, FolderOpen } from 'lucide-react';
import DashboardSection from '../../../components/layout/DashboardSection';
import { PartnerRowActions, BulkActionBar, SelectCheckbox } from '../../../components/admin/AdminTools';
import PartnerResourcesAdmin from '../../../components/admin/PartnerResourcesAdmin';
import Modal from '../../../components/Modal';
import { PARTNER_TYPES } from '../../../utils/constants';
import { partnerTypeLabel } from '../../../utils/constants';
import { api } from '../../../api';

export default function AdminPartnersPanel({
  pageInfo, partners, selectedPartners, setSelectedPartners, partnerFilter, setPartnerFilter,
  partnerTypeFilter, setPartnerTypeFilter, search, setSearch, load, toggleAll,
  onPartnerCreate, viewPartnerDetail, deletePartner, resetPassword, flash,
  setEditingPartner, setPartnerForm, setPartnerModal,
}) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [resourcesPartnerId, setResourcesPartnerId] = useState('all');

  const bulkPartners = async (action, data = {}) => {
    await api.admin.bulkPartners(selectedPartners, action, data);
    flash(`${selectedPartners.length} partners updated`);
    setSelectedPartners([]);
    load();
  };

  const openResources = (partnerId = 'all') => {
    setResourcesPartnerId(partnerId);
    setResourcesOpen(true);
  };

  return (
    <DashboardSection
      title={pageInfo.title}
      description={pageInfo.desc}
      actions={(
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openResources('all')} className="dm-btn-ghost text-sm">
            <FolderOpen className="h-4 w-4" /> Resources
          </button>
          <button type="button" onClick={() => onPartnerCreate(false)} className="dm-btn-primary text-sm">
            <UserPlus className="h-4 w-4" /> Add Partner
          </button>
        </div>
      )}
    >
      <BulkActionBar selected={selectedPartners} onClear={() => setSelectedPartners([])} actions={[
        { label: 'Approve', onClick: () => bulkPartners('approve') },
        { label: 'Suspend', onClick: () => bulkPartners('suspend') },
      ]} />
      <div className="flex flex-wrap gap-3">
        <select className="dm-input w-auto" value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)}>
          <option value="all">All Status</option>
          {['pending', 'active', 'suspended', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="dm-input w-auto" value={partnerTypeFilter} onChange={(e) => setPartnerTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {PARTNER_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input className="dm-input min-w-[200px] flex-1" placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" onClick={load} className="dm-btn-ghost"><Search className="h-4 w-4" /></button>
        <button type="button" onClick={() => openResources('all')} className="dm-btn-ghost"><FolderOpen className="h-4 w-4" /> Resources</button>
        <button type="button" onClick={() => onPartnerCreate(false)} className="dm-btn-primary"><UserPlus className="h-4 w-4" /> Add Partner</button>
        <button type="button" onClick={() => onPartnerCreate(true)} className="dm-btn-gold"><Store className="h-4 w-4" /> Add Agency</button>
      </div>
      <div className="dm-card overflow-x-auto">
        <table className="dm-table w-full">
          <thead>
            <tr>
              <th><SelectCheckbox checked={selectedPartners.length === partners.length && partners.length > 0} onChange={() => toggleAll(partners, selectedPartners, setSelectedPartners)} /></th>
              <th>Name / Partner ID</th><th>Type</th><th>Tier</th><th>Leads</th><th>Rates</th><th>Status</th><th>Verified</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id}>
                <td><SelectCheckbox checked={selectedPartners.includes(p.id)} onChange={() => setSelectedPartners((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])} /></td>
                <td>
                  <button type="button" className="text-left" onClick={() => viewPartnerDetail(p)}>
                    <p className="font-semibold text-orange hover:underline">{p.name}</p>
                    <p className="font-mono text-xs font-semibold text-gold-dark">{p.loginId || '—'}</p>
                    <p className="text-xs text-stone-400">{p.email}</p>
                    {(p.partnerType === 'agency' || p.partnerType === 'franchise') && <p className="text-xs text-orange">{p.territory || p.agencyName || p.franchiseName}</p>}
                  </button>
                </td>
                <td>{partnerTypeLabel(p.partnerType)}</td>
                <td className="capitalize">{p.tier || 'bronze'}</td>
                <td>{p.totalLeads} / <span className="text-emerald-600">{p.convertedLeads}</span></td>
                <td className="text-xs text-stone-500">Per product</td>
                <td><span className={`dm-badge capitalize ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span></td>
                <td>{p.documentsVerified ? '✓' : '—'}</td>
                <td>
                  <PartnerRowActions
                    partner={p}
                    onView={viewPartnerDetail}
                    onEdit={(x) => { setEditingPartner(x); setPartnerForm({ ...x, password: '' }); setPartnerModal(true); }}
                    onDelete={deletePartner}
                    onResetPwd={resetPassword}
                    onRecalc={async (x) => { await api.admin.recalculatePartner(x.id); flash('Stats recalculated'); load(); }}
                  />
                  <button type="button" onClick={() => openResources(p.id)} className="text-xs text-gold-dark">Resources</button>
                  {p.status === 'pending' && <button type="button" onClick={() => api.admin.updatePartner(p.id, { status: 'active' }).then(load)} className="text-xs text-emerald-600">Approve</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={resourcesOpen} onClose={() => setResourcesOpen(false)} title="Partner Resources" wide>
        <PartnerResourcesAdmin
          embedded
          initialPartnerId={resourcesPartnerId}
          onClose={() => setResourcesOpen(false)}
        />
      </Modal>
    </DashboardSection>
  );
}
