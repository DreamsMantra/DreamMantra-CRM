import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft, KeyRound, MessageSquare, Save, Plus, IndianRupee, FolderOpen, Package,
  Activity, ClipboardList, FolderKanban,
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import SectionBlock from '../../components/layout/SectionBlock';
import AdminSubTabs from '../../components/admin/AdminSubTabs';
import CustomLeadFilters, { applyCustomLeadFilters } from '../../components/CustomLeadFilters';
import JourneyTimeline from '../../components/JourneyTimeline';
import { partnerTypeLabel, formatCurrency, formatDate, PARTNER_TYPES, PARTNER_TIERS, LEAD_STATUSES } from '../../utils/constants';
import { leadDisplayName, leadLifecycleLabel } from '../../config/adminTabs';
import { api } from '../../api';

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'note', label: 'Note' },
];

const BASE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'leads', label: 'Leads' },
  { id: 'rates', label: 'Products & rates' },
  { id: 'money', label: 'Money' },
  { id: 'resources', label: 'Resources' },
  { id: 'activity', label: 'Activity' },
  { id: 'messages', label: 'Messages' },
];

/**
 * Tabbed partner profile.
 * Deep link: ?tab=partners&partnerId=…&inner=overview
 */
export default function PartnerProfilePage({
  partnerId, onBack, onOpenLead, onMessage, flash, fail, resetPassword, profileTab, onProfileTab,
}) {
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [commissionForm, setCommissionForm] = useState({ leadId: '', amount: '', notes: '' });
  const [rateDrafts, setRateDrafts] = useState({});
  const [filterRules, setFilterRules] = useState([]);
  const [journeyLeadId, setJourneyLeadId] = useState(null);
  const [activityForm, setActivityForm] = useState({ type: 'note', comment: '', at: '' });
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [assignProjectId, setAssignProjectId] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  const activeTab = profileTab || 'overview';
  const setActiveTab = (id) => onProfileTab?.(id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.admin.getPartner(partnerId);
      setDetail(d);
      const p = d.partner || {};
      setForm({
        name: p.name || '',
        phone: p.phone || '',
        email: p.email || '',
        organization: p.organization || '',
        partnerType: p.partnerType || 'referral_partner',
        tier: p.tier || 'bronze',
        status: p.status || 'pending',
        documentsVerified: !!p.documentsVerified,
        city: p.city || '',
        state: p.state || '',
        address: p.address || '',
        notes: p.notes || '',
        bankAccount: p.bankAccount || '',
        ifsc: p.ifsc || '',
        upiId: p.upiId || '',
        panNumber: p.panNumber || '',
        territory: p.territory || '',
        agencyName: p.agencyName || '',
      });
      const drafts = {};
      (d.productRates || []).forEach((r) => {
        drafts[r.productId] = {
          costPrice: r.costPrice,
          sellingPrice: r.sellingPrice,
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

  const isAgency = detail?.partner?.partnerType === 'agency' || detail?.partner?.partnerType === 'franchise';
  const tabs = useMemo(() => {
    if (isAgency) {
      const copy = [...BASE_TABS];
      copy.splice(3, 0, { id: 'projects', label: 'Projects' });
      return copy;
    }
    return BASE_TABS;
  }, [isAgency]);

  const filteredLeads = useMemo(
    () => applyCustomLeadFilters(detail?.leads || [], filterRules),
    [detail?.leads, filterRules]
  );

  const journeyLead = useMemo(
    () => (detail?.leads || []).find((l) => l.id === journeyLeadId) || null,
    [detail?.leads, journeyLeadId]
  );

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
        costPrice: Number(d.costPrice),
        sellingPrice: Number(d.sellingPrice),
        commission: { type: d.commissionType, value: Number(d.commissionValue) },
      });
      flash?.('Product prices saved for this partner');
      load();
    } catch (err) { fail?.(err); }
  };

  const saveProjectSelling = async (projectId, productId, sellingPrice) => {
    try {
      await api.admin.upsertProductRateOverride({
        scope: 'project',
        entityId: projectId,
        productId,
        sellingPrice: Number(sellingPrice),
      });
      flash?.('Project selling price saved (agency cannot change cost)');
      load();
    } catch (err) { fail?.(err); }
  };

  const saveProjectCost = async (projectId, productId, costPrice) => {
    try {
      await api.admin.upsertProductRateOverride({
        scope: 'project',
        entityId: projectId,
        productId,
        costPrice: Number(costPrice),
      });
      flash?.('Project cost price saved (Admin only)');
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

  const addActivity = async (e) => {
    e.preventDefault();
    try {
      await api.admin.createPartnerActivity(partnerId, {
        type: activityForm.type,
        comment: activityForm.comment,
        at: activityForm.at || new Date().toISOString(),
      });
      flash?.('Activity logged');
      setActivityForm({ type: 'note', comment: '', at: '' });
      load();
    } catch (err) { fail?.(err); }
  };

  const createProject = async (e) => {
    e.preventDefault();
    try {
      await api.admin.createPartnerProject(partnerId, projectForm);
      flash?.('Project created');
      setProjectForm({ name: '', description: '' });
      load();
    } catch (err) { fail?.(err); }
  };

  const renameProject = async (proj) => {
    const name = prompt('Project name', proj.name);
    if (!name?.trim()) return;
    try {
      await api.admin.updateAgencyProject(proj.id, { name: name.trim() });
      flash?.('Project renamed');
      load();
    } catch (err) { fail?.(err); }
  };

  const assignSelected = async () => {
    if (!assignProjectId || !selectedLeadIds.length) return;
    try {
      await api.admin.assignLeadsToProject(assignProjectId, selectedLeadIds);
      flash?.(`${selectedLeadIds.length} lead(s) assigned`);
      setSelectedLeadIds([]);
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
  const activities = detail.activities || [];
  const projects = detail.projects || [];
  const stages = detail.stageBreakdown || {};

  return (
    <div className="space-y-4">
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
          <button type="button" className="dm-btn-ghost text-sm" onClick={() => { setActiveTab('messages'); onMessage?.(p); }}>
            <MessageSquare className="h-4 w-4" /> Message
          </button>
          <button type="button" className="dm-btn-ghost text-sm" onClick={() => resetPassword?.(p)}>
            <KeyRound className="h-4 w-4" /> Reset Password
          </button>
          {activeTab === 'profile' && (
            <button type="button" className="dm-btn-primary text-sm" onClick={saveProfile}>
              <Save className="h-4 w-4" /> Save Profile
            </button>
          )}
        </div>
      </div>

      <AdminSubTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Leads" value={detail.stats?.totalLeads ?? 0} />
            <Stat label="Converted" value={detail.stats?.converted ?? 0} />
            <Stat label="Pending Commission" value={formatCurrency(detail.stats?.pendingCommission)} />
            <Stat label="Paid / Earnings" value={formatCurrency(detail.stats?.paidCommission ?? p.totalEarnings)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionBlock title="Status & quick actions">
              <p className="mb-3 text-sm">Status: <span className="dm-badge capitalize">{p.status}</span> · Tier: <span className="capitalize">{p.tier}</span></p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="dm-btn-ghost text-xs" onClick={() => setActiveTab('leads')}><ClipboardList className="h-3.5 w-3.5" /> Leads</button>
                <button type="button" className="dm-btn-ghost text-xs" onClick={() => setActiveTab('activity')}><Activity className="h-3.5 w-3.5" /> Log activity</button>
                <button type="button" className="dm-btn-ghost text-xs" onClick={() => setActiveTab('money')}><IndianRupee className="h-3.5 w-3.5" /> Money</button>
                {isAgency && <button type="button" className="dm-btn-ghost text-xs" onClick={() => setActiveTab('projects')}><FolderKanban className="h-3.5 w-3.5" /> Projects</button>}
              </div>
              {detail.nextFollowUp && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Next follow-up: <strong>{formatDate(detail.nextFollowUp.followUpDate)}</strong> — {leadDisplayName(detail.nextFollowUp)}
                </p>
              )}
            </SectionBlock>
            <SectionBlock title="Pipeline stages">
              <div className="flex flex-wrap gap-2">
                {Object.entries(stages).map(([status, count]) => (
                  <span key={status} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    {status.replace(/_/g, ' ')}: {count}
                  </span>
                ))}
                {!Object.keys(stages).length && <p className="text-sm text-stone-400">No leads yet</p>}
              </div>
            </SectionBlock>
          </div>
          <SectionBlock title="Recent activity">
            {(activities.slice(0, 5)).map((a) => (
              <div key={a.id} className="border-b border-stone-50 py-2 text-sm">
                <span className="dm-badge text-[10px] capitalize">{a.type}</span>{' '}
                <span className="text-stone-800">{a.comment}</span>
                <p className="text-xs text-stone-400">{formatDate(a.at || a.createdAt)} · {a.createdByName}</p>
              </div>
            ))}
            {!activities.length && <p className="text-sm text-stone-400">No communications logged yet.</p>}
          </SectionBlock>
        </div>
      )}

      {activeTab === 'profile' && (
        <SectionBlock title="Profile & KYC" description="Super Admin can edit all fields and dropdowns">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Organization" value={form.organization} onChange={(v) => setForm({ ...form, organization: v })} />
            <div>
              <label className="dm-label">Partner type</label>
              <select className="dm-input" value={form.partnerType} onChange={(e) => setForm({ ...form, partnerType: e.target.value })}>
                {PARTNER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="dm-label">Tier</label>
              <select className="dm-input" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                {PARTNER_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="dm-label">Status</label>
              <select className="dm-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['pending', 'active', 'suspended', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            {isAgency && (
              <>
                <Field label="Agency name" value={form.agencyName} onChange={(v) => setForm({ ...form, agencyName: v })} />
                <Field label="Territory" value={form.territory} onChange={(v) => setForm({ ...form, territory: v })} />
              </>
            )}
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={!!form.documentsVerified} onChange={(e) => setForm({ ...form, documentsVerified: e.target.checked })} />
              Documents verified
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Bank account" value={form.bankAccount} onChange={(v) => setForm({ ...form, bankAccount: v })} />
            <Field label="IFSC" value={form.ifsc} onChange={(v) => setForm({ ...form, ifsc: v })} />
            <Field label="UPI" value={form.upiId} onChange={(v) => setForm({ ...form, upiId: v })} />
            <Field label="PAN" value={form.panNumber} onChange={(v) => setForm({ ...form, panNumber: v })} />
          </div>
          <p className="mt-3 text-xs text-stone-400">Referral: <code className="text-gold-dark">{p.referralCode || '—'}</code></p>
          <button type="button" className="dm-btn-primary mt-4" onClick={saveProfile}><Save className="h-4 w-4" /> Save all profile fields</button>
        </SectionBlock>
      )}

      {activeTab === 'leads' && (
        <div className="space-y-4">
          <SectionBlock title="Leads given" description={`${filteredLeads.length} of ${leads.length} lead(s) · journey tracking per lead`}>
            <CustomLeadFilters rules={filterRules} onChange={setFilterRules} statuses={LEAD_STATUSES} />
            <div className="mb-3 mt-2 flex flex-wrap items-center gap-2">
              <select className="dm-input w-auto" value={assignProjectId} onChange={(e) => setAssignProjectId(e.target.value)}>
                <option value="">Assign selected to project…</option>
                {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
              <button type="button" className="dm-btn-ghost text-xs" disabled={!assignProjectId || !selectedLeadIds.length} onClick={assignSelected}>
                Assign ({selectedLeadIds.length})
              </button>
            </div>
            <div className="dm-card overflow-x-auto">
              <table className="dm-table w-full">
                <thead>
                  <tr>
                    <th />
                    <th>Lead ID</th><th>Name</th><th>Type</th><th>Status</th><th>Project</th><th>Date</th><th>Journey</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(l.id)}
                          onChange={() => setSelectedLeadIds((ids) => ids.includes(l.id) ? ids.filter((x) => x !== l.id) : [...ids, l.id])}
                        />
                      </td>
                      <td className="font-mono text-xs font-semibold">{l.leadId}</td>
                      <td>
                        <button type="button" className="font-medium text-orange hover:underline" onClick={() => onOpenLead?.(l)}>
                          {leadDisplayName(l)}
                        </button>
                      </td>
                      <td><span className="dm-badge text-xs">{leadLifecycleLabel(l)}</span></td>
                      <td><StatusBadge status={l.status} /></td>
                      <td className="text-xs">{l.project || '—'}</td>
                      <td className="text-xs text-stone-500">{formatDate(l.createdAt)}</td>
                      <td>
                        <button type="button" className="text-xs text-gold-dark hover:underline" onClick={() => setJourneyLeadId(journeyLeadId === l.id ? null : l.id)}>
                          {journeyLeadId === l.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredLeads.length && <tr><td colSpan={8} className="py-8 text-center text-stone-400">No leads match filters</td></tr>}
                </tbody>
              </table>
            </div>
            {journeyLead && (
              <div className="mt-4 rounded-xl border border-stone-200 p-4">
                <p className="mb-2 font-semibold">Journey — {leadDisplayName(journeyLead)}</p>
                <JourneyTimeline lead={journeyLead} />
              </div>
            )}
          </SectionBlock>
        </div>
      )}

      {activeTab === 'projects' && isAgency && (
        <SectionBlock title="Agency projects" description="School / campaign batches. Selling price is shared across leads in a project. Cost is Admin-only (agency cannot change cost).">
          <form onSubmit={createProject} className="mb-4 grid gap-3 rounded-xl border border-orange/20 bg-orange/5 p-4 sm:grid-cols-3">
            <div>
              <label className="dm-label">Project name</label>
              <input className="dm-input" required placeholder="e.g. ABC School — March visit" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
            </div>
            <div>
              <label className="dm-label">Description</label>
              <input className="dm-input" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
            </div>
            <button type="submit" className="dm-btn-primary self-end text-sm"><Plus className="h-4 w-4" /> Create project</button>
          </form>
          <div className="space-y-3">
            {projects.map((pr) => (
              <div key={pr.id} className="rounded-xl border border-stone-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-900">{pr.name}</p>
                    {pr.description && <p className="text-xs text-stone-500">{pr.description}</p>}
                    <p className="mt-1 text-sm text-stone-600">{pr.leadCount || 0} leads · {pr.converted || 0} converted</p>
                  </div>
                  <button type="button" className="text-xs text-gold-dark hover:underline" onClick={() => renameProject(pr)}>Rename</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(pr.stages || {}).map(([st, n]) => (
                    <span key={st} className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-stone-700">
                      {st.replace(/_/g, ' ')}: {n}
                    </span>
                  ))}
                  {!Object.keys(pr.stages || {}).length && <span className="text-xs text-stone-400">No leads assigned yet — use Leads tab to assign</span>}
                </div>
                {(pr.productPrices || []).length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Project prices</p>
                    {(pr.productPrices || []).map((pp) => (
                      <ProjectPriceRow
                        key={pp.productId}
                        product={pp}
                        onSaveCost={(cost) => saveProjectCost(pr.id, pp.productId, cost)}
                        onSaveSelling={(sell) => saveProjectSelling(pr.id, pp.productId, sell)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!projects.length && <p className="text-sm text-stone-400">No projects yet. Create one for each school or campaign.</p>}
          </div>
        </SectionBlock>
      )}

      {activeTab === 'rates' && (
        <SectionBlock
          title="Products & rates"
          description={
            isAgency
              ? 'Cost = what we sell to this agency. Selling = what they charge customers. Agency can change selling (incl. per project), not cost. Only allocated products are listed.'
              : 'Cost = what we sell to this partner. Selling = default customer price (can still vary per lead). Only allocated products are listed.'
          }
        >
          <div className="space-y-3">
            {productRates.map((r) => {
              const d = rateDrafts[r.productId] || {};
              return (
                <div key={r.productId} className="grid items-end gap-3 rounded-xl border border-stone-100 p-3 sm:grid-cols-5">
                  <div>
                    <p className="flex items-center gap-1 text-sm font-semibold"><Package className="h-3.5 w-3.5" /> {r.label}</p>
                    {r.hasOverride && <p className="text-[10px] text-orange">Partner override active</p>}
                  </div>
                  <div>
                    <label className="dm-label">Cost price ₹</label>
                    <input type="number" className="dm-input" value={d.costPrice ?? ''} onChange={(e) => setRateDrafts({ ...rateDrafts, [r.productId]: { ...d, costPrice: e.target.value } })} />
                    <p className="text-[10px] text-stone-400">Admin only</p>
                  </div>
                  <div>
                    <label className="dm-label">Selling price ₹</label>
                    <input type="number" className="dm-input" value={d.sellingPrice ?? ''} onChange={(e) => setRateDrafts({ ...rateDrafts, [r.productId]: { ...d, sellingPrice: e.target.value } })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="dm-label">Comm.</label>
                      <select className="dm-input" value={d.commissionType || 'fixed'} onChange={(e) => setRateDrafts({ ...rateDrafts, [r.productId]: { ...d, commissionType: e.target.value } })}>
                        <option value="fixed">₹</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                    <div>
                      <label className="dm-label">Value</label>
                      <input type="number" className="dm-input" value={d.commissionValue ?? ''} onChange={(e) => setRateDrafts({ ...rateDrafts, [r.productId]: { ...d, commissionValue: e.target.value } })} />
                    </div>
                  </div>
                  <button type="button" className="dm-btn-ghost text-sm" onClick={() => saveRate(r.productId)}>Save</button>
                </div>
              );
            })}
            {!productRates.length && (
              <p className="text-sm text-stone-400">No products allocated. Assign products under Settings → Products &amp; Pricing.</p>
            )}
          </div>
        </SectionBlock>
      )}

      {activeTab === 'money' && (
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
            <button type="submit" className="dm-btn-primary self-end text-sm"><Plus className="h-4 w-4" /> Add</button>
          </form>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr><th>Date</th><th>Lead</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="text-xs">{formatDate(c.createdAt)}</td>
                    <td className="font-mono text-xs">{c.lead?.leadId || '—'}</td>
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
              <p className="mb-2 text-sm font-semibold">Payout requests</p>
              {payouts.map((req) => (
                <div key={req.id} className="flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                  <span>{formatCurrency(req.amount)} · {req.status}</span>
                  <span className="text-xs text-stone-400">{formatDate(req.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionBlock>
      )}

      {activeTab === 'resources' && (
        <SectionBlock title="Resources shared">
          <div className="space-y-2">
            {resources.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-stone-100 px-3 py-2 text-sm hover:bg-stone-50">
                <FolderOpen className="h-4 w-4 text-gold-dark" />
                <span className="font-medium">{r.title}</span>
                <span className="text-xs capitalize text-stone-400">{r.category}</span>
              </a>
            ))}
            {!resources.length && <p className="text-sm text-stone-400">No resources yet. Add via Partners → Resources.</p>}
          </div>
        </SectionBlock>
      )}

      {activeTab === 'activity' && (
        <SectionBlock title="Activity log" description="Calls, WhatsApp, meetings, notes — Super Admin, Sales & Counsellors">
          <form onSubmit={addActivity} className="mb-4 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-4">
            <div>
              <label className="dm-label">Type</label>
              <select className="dm-input" value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}>
                {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="dm-label">Date & time</label>
              <input type="datetime-local" className="dm-input" value={activityForm.at} onChange={(e) => setActivityForm({ ...activityForm, at: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="dm-label">Comment</label>
              <input className="dm-input" required placeholder="What was discussed…" value={activityForm.comment} onChange={(e) => setActivityForm({ ...activityForm, comment: e.target.value })} />
            </div>
            <button type="submit" className="dm-btn-primary sm:col-span-4 text-sm"><Plus className="h-4 w-4" /> Add to activity log</button>
          </form>
          <div className="relative space-y-0 border-l-2 border-stone-200 pl-4">
            {activities.map((a) => (
              <div key={a.id} className="relative pb-5">
                <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-orange ring-2 ring-white" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="dm-badge text-[10px] capitalize">{a.type}</span>
                  <span className="text-xs text-stone-400">{formatDate(a.at || a.createdAt)} · {a.createdByName || '—'} ({a.createdByRole || ''})</span>
                </div>
                <p className="mt-1 text-sm text-stone-800">{a.comment}</p>
              </div>
            ))}
            {!activities.length && <p className="py-4 text-sm text-stone-400">No activity yet.</p>}
          </div>
        </SectionBlock>
      )}

      {activeTab === 'messages' && (
        <SectionBlock title="Messages" description="Open the Messages tab to chat with this partner">
          <button type="button" className="dm-btn-primary" onClick={() => onMessage?.(p)}>
            <MessageSquare className="h-4 w-4" /> Open Messages
          </button>
          <p className="mt-2 text-sm text-stone-500">Opens the CRM Messages inbox so you can continue the conversation with {p.name}.</p>
        </SectionBlock>
      )}
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

function ProjectPriceRow({ product, onSaveCost, onSaveSelling }) {
  const [cost, setCost] = useState(product.costPrice ?? '');
  const [selling, setSelling] = useState(product.sellingPrice ?? '');
  useEffect(() => {
    setCost(product.costPrice ?? '');
    setSelling(product.sellingPrice ?? '');
  }, [product.costPrice, product.sellingPrice, product.productId]);
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg bg-stone-50 p-2 text-sm">
      <span className="min-w-[7rem] font-medium">{product.label}</span>
      <div>
        <label className="dm-label text-[10px]">Cost ₹ (Admin)</label>
        <input type="number" className="dm-input w-24" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <button type="button" className="dm-btn-ghost text-[10px]" onClick={() => onSaveCost(cost)}>Save cost</button>
      <div>
        <label className="dm-label text-[10px]">Selling ₹</label>
        <input type="number" className="dm-input w-24" value={selling} onChange={(e) => setSelling(e.target.value)} />
      </div>
      <button type="button" className="dm-btn-ghost text-[10px]" onClick={() => onSaveSelling(selling)}>Save selling</button>
    </div>
  );
}
