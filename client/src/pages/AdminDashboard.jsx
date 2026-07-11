import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, IndianRupee, Plus, Search, CheckCircle, AlertCircle,
  UserPlus, TrendingUp, BarChart3, Activity, Megaphone, Settings, Calendar,
  Database, Bell, Copy, Trash2, Send, Shield, Columns3, Sparkles, Store,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LeadForm, { emptyLeadForm } from '../components/LeadForm';
import BarChart from '../components/charts/BarChart';
import ConversionFunnel from '../components/charts/ConversionFunnel';
import ActivityFeed from '../components/ActivityFeed';
import FollowUpList from '../components/FollowUpList';
import BulkLeadImport from '../components/BulkLeadImport';
import ExportButton from '../components/ExportButton';
import LeadComments from '../components/LeadComments';
import LeadKanban from '../components/LeadKanban';
import AdminGlobalSearch from '../components/AdminGlobalSearch';
import CredentialsModal from '../components/CredentialsModal';
import { PartnerDetailModal, PartnerRowActions, BulkActionBar, SelectCheckbox } from '../components/admin/AdminTools';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { PARTNER_TYPES, PARTNER_TIERS, LEAD_STATUSES, FRANCHISE_INVESTMENT_TIERS, FRANCHISE_OPERATING_MODELS, formatDate, formatCurrency, partnerTypeLabel } from '../utils/constants';

const baseLinks = [
  { to: '/admin', label: 'Command Center', icon: LayoutDashboard, end: true },
  { to: '/admin?tab=partners', label: 'Partners', icon: Users },
  { to: '/admin?tab=franchises', label: 'Franchises', icon: Store },
  { to: '/admin?tab=leads', label: 'All Leads', icon: ClipboardList },
  { to: '/admin?tab=kanban', label: 'Lead Board', icon: Columns3 },
  { to: '/admin?tab=duplicates', label: 'Duplicates', icon: Copy },
  { to: '/admin?tab=follow-ups', label: 'Follow-ups', icon: Calendar },
  { to: '/admin?tab=commissions', label: 'Commissions', icon: IndianRupee },
  { to: '/admin?tab=reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin?tab=notify', label: 'Send Notification', icon: Bell },
  { to: '/admin?tab=data', label: 'Data & Import', icon: Database },
  { to: '/admin?tab=activity', label: 'Activity Log', icon: Activity },
  { to: '/admin?tab=announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin?tab=settings', label: 'CRM Settings', icon: Settings },
];

const LOGIN_PREFIX = {
  referral_partner: 'REF', teacher: 'TCH', school: 'SCH', college: 'COL',
  coaching_center: 'CCH', influencer: 'INF', counsellor: 'CNS', franchise: 'FRN',
};

function suggestLoginId(partnerType) {
  const prefix = LOGIN_PREFIX[partnerType] || 'PTR';
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

const emptyPartner = {
  name: '', email: '', phone: '', loginId: '', password: '', partnerType: 'teacher',
  organization: '', city: '', state: '', address: '', commissionRate: 10,
  status: 'active', tier: 'bronze', notes: '',
  franchiseName: '', territory: '', outletCount: 1, investmentTier: 'starter',
  operatingModel: 'single_outlet', royaltyPercent: 8, agreementDate: '',
};

const SETTINGS_FIELDS = [
  { key: 'companyName', label: 'Company Name', type: 'text' },
  { key: 'supportEmail', label: 'Support Email', type: 'email' },
  { key: 'supportPhone', label: 'Support Phone', type: 'text' },
  { key: 'whatsappNumber', label: 'WhatsApp Number', type: 'text' },
  { key: 'defaultCommissionRate', label: 'Default Commission %', type: 'number' },
  { key: 'minPayoutAmount', label: 'Min Payout (₹)', type: 'number' },
  { key: 'welcomeMessage', label: 'Welcome Message', type: 'textarea' },
  { key: 'autoApprovePartners', label: 'Auto-approve Partners', type: 'checkbox' },
];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followUps, setFollowUps] = useState({ overdue: [], upcoming: [], today: [] });
  const [announcements, setAnnouncements] = useState([]);
  const [settings, setSettings] = useState({});
  const [systemStats, setSystemStats] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [partners, setPartners] = useState([]);
  const [leads, setLeads] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [partnerModal, setPartnerModal] = useState(false);
  const [partnerForm, setPartnerForm] = useState(emptyPartner);
  const [credentialsData, setCredentialsData] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerDetail, setPartnerDetail] = useState(null);
  const [viewPartner, setViewPartner] = useState(null);

  const [selectedLead, setSelectedLead] = useState(null);
  const [leadComments, setLeadComments] = useState([]);
  const [leadUpdate, setLeadUpdate] = useState({});
  const [leadEditForm, setLeadEditForm] = useState(null);
  const [leadModal, setLeadModal] = useState(false);
  const [adminLeadForm, setAdminLeadForm] = useState({ ...emptyLeadForm, partnerId: '' });
  const [transferPartnerId, setTransferPartnerId] = useState('');

  const [selectedPartners, setSelectedPartners] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedCommissions, setSelectedCommissions] = useState([]);

  const [announceForm, setAnnounceForm] = useState({ title: '', message: '' });
  const [notifyForm, setNotifyForm] = useState({ partnerId: 'all', title: '', message: '', link: '' });
  const [commissionForm, setCommissionForm] = useState({ partnerId: '', leadId: '', amount: '', rate: 10, notes: '' });
  const [commissionModal, setCommissionModal] = useState(false);
  const [bulkImportPartner, setBulkImportPartner] = useState('');

  const [partnerFilter, setPartnerFilter] = useState('all');
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('all');
  const [leadFilter, setLeadFilter] = useState('all');
  const [leadPartnerFilter, setLeadPartnerFilter] = useState('all');
  const [leadPriorityFilter, setLeadPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };
  const fail = (err) => setError(err.message || 'Error');

  const sidebarLinks = baseLinks.map((l) => ({
    ...l,
    badge: l.label === 'Follow-ups' ? followUps.overdue?.length
      : l.label === 'Partners' ? dashboard?.stats?.pendingPartners
      : l.label === 'Duplicates' ? duplicates.length : 0,
  }));

  const load = useCallback(async () => {
    setError('');
    try {
      const [dash, partnerData, leadData, commData, fuData, dupData] = await Promise.all([
        api.admin.dashboard(),
        api.admin.partners({ status: partnerFilter, partnerType: partnerTypeFilter, search }),
        api.admin.leads({ status: leadFilter, partnerId: leadPartnerFilter, priority: leadPriorityFilter, search }),
        api.admin.commissions(),
        api.admin.followUps(),
        api.admin.duplicates(),
      ]);
      setDashboard(dash);
      setPartners(partnerData.partners);
      setLeads(leadData.leads);
      setCommissions(commData.commissions);
      setFollowUps(fuData);
      setDuplicates(dupData.groups || []);
      if (tab === 'reports' || tab === 'overview') setReports(await api.admin.reports());
      if (tab === 'activity' || tab === 'overview') setActivities((await api.admin.activity()).activities);
      if (tab === 'announcements') setAnnouncements((await api.admin.announcements()).announcements);
      if (tab === 'settings' || tab === 'data') {
        const sys = await api.admin.system();
        setSettings(sys.settings);
        setSystemStats(sys.stats);
      }
      if (tab === 'franchises' || tab === 'overview') {
        const fr = await api.admin.franchises();
        setFranchises(fr.franchises || []);
      }
    } catch (err) { fail(err); }
  }, [tab, partnerFilter, partnerTypeFilter, leadFilter, leadPartnerFilter, leadPriorityFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openLeadDetail = async (lead) => {
    setSelectedLead(lead);
    setLeadUpdate({
      status: lead.status, adminNotes: lead.adminNotes || '', note: '',
      expectedValue: lead.expectedValue || 5000, priority: lead.priority,
      followUpDate: lead.followUpDate?.slice?.(0, 10) || '', tags: (lead.tags || []).join(', '),
    });
    setLeadEditForm({
      studentName: lead.studentName, studentPhone: lead.studentPhone,
      studentEmail: lead.studentEmail || '', classGrade: lead.classGrade || '',
      city: lead.city || '', notes: lead.notes || '', priority: lead.priority,
    });
    setTransferPartnerId('');
    try {
      const { comments } = await api.admin.leadComments(lead.id || lead._id);
      setLeadComments(comments);
    } catch { setLeadComments([]); }
  };

  const viewPartnerDetail = async (p) => {
    setViewPartner(p);
    const detail = await api.admin.getPartner(p.id);
    setPartnerDetail(detail);
  };

  const savePartnerFromDetail = async (id, form) => {
    await api.admin.updatePartner(id, form);
    flash('Partner updated');
    setViewPartner(null);
    load();
  };

  const deletePartner = async (p) => {
    if (!confirm(`Delete partner "${p.name}"? Their leads will remain but partner account is removed.`)) return;
    await api.admin.deletePartner(p.id);
    flash('Partner deleted');
    load();
  };

  const resetPassword = async (p) => {
    const pwd = prompt('New password (min 6 characters):') ?? '';
    if (!pwd || pwd.length < 6) {
      if (pwd !== '') fail(new Error('Password must be at least 6 characters'));
      return;
    }
    const res = await api.admin.resetPartnerPassword(p.id, pwd);
    setCredentialsData({
      credentials: res.credentials || { loginId: p.loginId, email: p.email, password: res.tempPassword },
      name: p.name,
    });
    flash('Password reset — share new credentials with partner');
  };

  const bulkPartners = async (action, data = {}) => {
    await api.admin.bulkPartners(selectedPartners, action, data);
    flash(`${selectedPartners.length} partners updated`);
    setSelectedPartners([]);
    load();
  };

  const bulkLeads = async (status) => {
    await api.admin.bulkLeadAction({ ids: selectedLeads, status });
    flash(`${selectedLeads.length} leads updated`);
    setSelectedLeads([]);
    load();
  };

  const deleteLead = async (lead) => {
    if (!confirm(`Delete lead ${lead.studentName}?`)) return;
    await api.admin.deleteLead(lead.id || lead._id);
    flash('Lead deleted');
    setSelectedLead(null);
    load();
  };

  const openPartnerCreate = (asFranchise = false) => {
    setEditingPartner(null);
    const type = asFranchise ? 'franchise' : emptyPartner.partnerType;
    setPartnerForm({
      ...emptyPartner,
      partnerType: type,
      loginId: suggestLoginId(type),
      password: 'Partner@123',
      ...(asFranchise ? { commissionRate: 15, tier: 'gold', royaltyPercent: 8 } : {}),
    });
    setPartnerModal(true);
  };

  const toggleAll = (items, selected, setSelected, idKey = 'id') => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((i) => i[idKey] || i._id));
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      title="Admin Control Panel"
      badge={dashboard?.stats?.pendingPartners}
      headerActions={(
        <AdminGlobalSearch
          onSelectPartner={(p) => { setParams({ tab: 'partners' }); viewPartnerDetail(p); }}
          onSelectLead={(l) => { setParams({ tab: 'leads' }); openLeadDetail(l); }}
        />
      )}
    >
      {message && <div className="dm-alert-success mb-4"><CheckCircle className="h-4 w-4" /> {message}</div>}
      {error && <div className="dm-alert-error mb-4"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {/* ─── COMMAND CENTER ─── */}
      {tab === 'overview' && dashboard && (
        <div className="space-y-6">
          <div className="dm-card flex flex-wrap gap-3 p-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-700"><Shield className="h-4 w-4 text-gold" /> Quick Actions:</span>
            <button type="button" className="dm-btn-primary text-xs" onClick={() => openPartnerCreate(false)}><UserPlus className="h-3 w-3" /> Add Partner</button>
            <button type="button" className="dm-btn-gold text-xs" onClick={() => openPartnerCreate(true)}><Store className="h-3 w-3" /> Add Franchise</button>
            <button type="button" className="dm-btn-ghost text-xs" onClick={() => setParams({ tab: 'kanban' })}><Columns3 className="h-3 w-3" /> Lead Board</button>
            <button type="button" className="dm-btn-ghost text-xs" onClick={async () => { const pending = partners.filter((p) => p.status === 'pending'); if (pending.length) { await api.admin.bulkPartners(pending.map((p) => p.id), 'approve'); flash(`Approved ${pending.length} partners`); load(); } }}>Approve All Pending</button>
            <button type="button" className="dm-btn-ghost text-xs" onClick={() => setParams({ tab: 'duplicates' })}>View Duplicates ({duplicates.length})</button>
            <ExportButton href={api.admin.exportLeads()} token={token} label="Export Leads" />
            <ExportButton href={api.admin.exportPartners()} token={token} label="Export Partners" />
          </div>

          <div className="dm-card flex items-center gap-3 border-gold/20 bg-gradient-to-r from-gold/5 to-orange/5 p-4">
            <Sparkles className="h-5 w-5 text-gold-dark" />
            <p className="text-sm text-stone-700">
              <strong>Mission Control:</strong> Press <kbd className="rounded border border-stone-200 bg-white px-1.5 font-mono text-xs">Ctrl+K</kbd> to search anything. Drag leads on the Lead Board. Create partners with custom Partner ID + password.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Active Partners" value={dashboard.stats.activePartners} sub={`${dashboard.stats.pendingPartners} pending`} accent="gold" />
            <StatCard icon={ClipboardList} label="Total Leads" value={dashboard.stats.totalLeads} sub={`${dashboard.stats.leadsThisMonth} this month`} accent="orange" />
            <StatCard icon={TrendingUp} label="Converted" value={dashboard.stats.convertedLeads} accent="green" />
            <StatCard icon={IndianRupee} label="Paid Out" value={formatCurrency(dashboard.stats.totalCommissionPaid)} sub={`${dashboard.stats.pendingCommissions} pending`} accent="blue" />
          </div>

          {(dashboard.followUpCounts?.overdue > 0) && (
            <div className="dm-alert-warning"><AlertCircle className="h-4 w-4" /> {dashboard.followUpCounts.overdue} overdue follow-ups — <button type="button" className="font-semibold underline" onClick={() => setParams({ tab: 'follow-ups' })}>Manage</button></div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="dm-card p-5"><h3 className="dm-section-title mb-4">Monthly Leads</h3><BarChart data={dashboard.monthlyTrends || []} /></div>
            <div className="dm-card p-5">
              <h3 className="dm-section-title mb-4">Partner Types</h3>
              <div className="space-y-2">
                {PARTNER_TYPES.map((t) => (
                  <div key={t.value} className="flex justify-between text-sm">
                    <span className="text-stone-600">{t.label}</span>
                    <span className="font-bold text-gold-dark">{dashboard.stats.partnerTypeCounts?.[t.value] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="dm-card overflow-hidden">
              <div className="border-b border-stone-100 p-4"><h3 className="dm-section-title">Recent Leads</h3></div>
              <table className="dm-table w-full">
                <tbody>{dashboard.recentLeads.map((lead) => (
                  <tr key={lead.id || lead._id} className="cursor-pointer" onClick={() => openLeadDetail(lead)}>
                    <td className="font-mono text-gold-dark">{lead.leadId}</td>
                    <td>{lead.studentName}</td>
                    <td><StatusBadge status={lead.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="dm-card p-5"><h3 className="dm-section-title mb-4">Recent Activity</h3><ActivityFeed activities={dashboard.recentActivity || []} limit={8} /></div>
          </div>
        </div>
      )}

      {/* ─── PARTNERS ─── */}
      {tab === 'partners' && (
        <div className="space-y-4">
          <BulkActionBar selected={selectedPartners} onClear={() => setSelectedPartners([])} actions={[
            { label: 'Approve', onClick: () => bulkPartners('approve') },
            { label: 'Suspend', onClick: () => bulkPartners('suspend') },
            { label: 'Set Gold Tier', onClick: () => bulkPartners('set_tier', { tier: 'gold' }) },
            { label: 'Commission 15%', onClick: () => bulkPartners('set_commission', { commissionRate: 15 }) },
          ]} />
          <div className="flex flex-wrap gap-3">
            <select className="dm-input w-auto" value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)}>
              <option value="all">All Status</option>
              {['pending','active','suspended','rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="dm-input w-auto" value={partnerTypeFilter} onChange={(e) => setPartnerTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {PARTNER_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input className="dm-input min-w-[200px] flex-1" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" onClick={load} className="dm-btn-ghost"><Search className="h-4 w-4" /></button>
            <ExportButton href={api.admin.exportPartners()} token={token} />
            <button type="button" onClick={openPartnerCreate} className="dm-btn-primary"><UserPlus className="h-4 w-4" /> Add</button>
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr>
                <th><SelectCheckbox checked={selectedPartners.length === partners.length && partners.length > 0} onChange={() => toggleAll(partners, selectedPartners, setSelectedPartners)} /></th>
                <th>Name / Partner ID</th><th>Type</th><th>Tier</th><th>Leads</th><th>Commission</th><th>Status</th><th>Verified</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td><SelectCheckbox checked={selectedPartners.includes(p.id)} onChange={() => setSelectedPartners((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])} /></td>
                    <td>
                      <p className="font-semibold">{p.name}</p>
              <p className="font-mono text-xs font-semibold text-gold-dark">{p.loginId || '—'}</p>
              <p className="text-xs text-stone-400">{p.email}</p>
              {p.partnerType === 'franchise' && <p className="text-xs text-orange">{p.territory || p.franchiseName}</p>}
                    </td>
                    <td>{partnerTypeLabel(p.partnerType)}</td>
                    <td className="capitalize">{p.tier || 'bronze'}</td>
                    <td>{p.totalLeads} / <span className="text-emerald-600">{p.convertedLeads}</span></td>
                    <td>{p.commissionRate}%</td>
                    <td><span className={`dm-badge capitalize ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span></td>
                    <td>{p.documentsVerified ? '✓' : '—'}</td>
                    <td>
                      <PartnerRowActions partner={p} onView={viewPartnerDetail} onEdit={(x) => { setEditingPartner(x); setPartnerForm({ ...x, password: '' }); setPartnerModal(true); }} onDelete={deletePartner} onResetPwd={resetPassword} onRecalc={async (x) => { await api.admin.recalculatePartner(x.id); flash('Stats recalculated'); load(); }} />
                      {p.status === 'pending' && <button type="button" onClick={() => api.admin.updatePartner(p.id, { status: 'active' }).then(load)} className="text-xs text-emerald-600">Approve</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── FRANCHISES ─── */}
      {tab === 'franchises' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900">Franchise Network</h2>
              <p className="text-sm text-stone-500">{franchises.length} franchise partner{franchises.length !== 1 ? 's' : ''} · {systemStats?.franchises ?? franchises.length} total</p>
            </div>
            <button type="button" onClick={() => openPartnerCreate(true)} className="dm-btn-gold"><Store className="h-4 w-4" /> New Franchise</button>
          </div>
          {franchises.length === 0 ? (
            <div className="dm-card p-12 text-center text-stone-400">No franchise partners yet. Create one or approve franchise applications.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {franchises.map((f) => (
                <div key={f.id} className="dm-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="dm-badge bg-gold/15 text-gold-dark">{f.franchiseCode || 'FRN'}</span>
                      <h3 className="mt-2 font-display font-bold text-stone-900">{f.franchiseName || f.name}</h3>
                      <p className="text-sm text-stone-500">{f.territory || f.city} · {f.outletCount || 1} outlet(s)</p>
                    </div>
                    <span className={`dm-badge capitalize ${f.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{f.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-stone-50 p-2"><p className="font-bold text-stone-900">{f.stats?.totalLeads || 0}</p><p className="text-stone-400">Leads</p></div>
                    <div className="rounded-lg bg-stone-50 p-2"><p className="font-bold text-emerald-600">{f.stats?.conversionRate || 0}%</p><p className="text-stone-400">Conv.</p></div>
                    <div className="rounded-lg bg-stone-50 p-2"><p className="font-bold text-gold-dark">{f.stats?.onboardingProgress || 0}%</p><p className="text-stone-400">Onboard</p></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => viewPartnerDetail(f)} className="dm-btn-ghost flex-1 text-xs">View</button>
                    <button type="button" onClick={() => { setEditingPartner(f); setPartnerForm({ ...f, password: '' }); setPartnerModal(true); }} className="dm-btn-primary flex-1 text-xs">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── LEADS ─── */}
      {tab === 'leads' && (
        <div className="space-y-4">
          <BulkActionBar selected={selectedLeads} onClear={() => setSelectedLeads([])} actions={[
            ...LEAD_STATUSES.slice(0, 4).map((s) => ({ label: `→ ${s.label}`, onClick: () => bulkLeads(s.value) })),
            { label: 'Delete Selected', danger: true, onClick: async () => { if (confirm(`Delete ${selectedLeads.length} leads?`)) { for (const id of selectedLeads) await api.admin.deleteLead(id); flash('Deleted'); setSelectedLeads([]); load(); } } },
          ]} />
          <div className="flex flex-wrap gap-3">
            <select className="dm-input w-auto" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)}>
              <option value="all">All Status</option>
              {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="dm-input w-auto" value={leadPartnerFilter} onChange={(e) => setLeadPartnerFilter(e.target.value)}>
              <option value="all">All Partners</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="dm-input w-auto" value={leadPriorityFilter} onChange={(e) => setLeadPriorityFilter(e.target.value)}>
              <option value="all">All Priority</option>
              {['low','medium','high'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input className="dm-input min-w-[180px] flex-1" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" onClick={load} className="dm-btn-ghost"><Search className="h-4 w-4" /></button>
            <ExportButton href={api.admin.exportLeads({ status: leadFilter, search })} token={token} />
            <button type="button" onClick={() => setLeadModal(true)} className="dm-btn-primary"><Plus className="h-4 w-4" /> Add Lead</button>
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr>
                <th><SelectCheckbox checked={selectedLeads.length === leads.length && leads.length > 0} onChange={() => toggleAll(leads, selectedLeads, setSelectedLeads)} /></th>
                <th>ID</th><th>Student</th><th>Partner</th><th>Status</th><th>Priority</th><th>Follow-up</th>
              </tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id || lead._id} className="cursor-pointer" onClick={() => openLeadDetail(lead)}>
                    <td onClick={(e) => e.stopPropagation()}><SelectCheckbox checked={selectedLeads.includes(lead.id || lead._id)} onChange={() => setSelectedLeads((s) => { const id = lead.id || lead._id; return s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; })} /></td>
                    <td className="font-mono text-gold-dark">{lead.leadId}</td>
                    <td className="font-medium">{lead.studentName}<br /><span className="text-xs text-stone-400">{lead.studentPhone}</span></td>
                    <td>{lead.partner?.name || lead.partnerName}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td className="capitalize">{lead.priority}</td>
                    <td className="text-stone-400">{formatDate(lead.followUpDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── KANBAN BOARD ─── */}
      {tab === 'kanban' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900">Lead Pipeline Board</h2>
              <p className="text-sm text-stone-500">Drag cards between columns to update status instantly</p>
            </div>
            <button type="button" onClick={load} className="dm-btn-ghost"><Search className="h-4 w-4" /> Refresh</button>
          </div>
          <LeadKanban
            leads={leads}
            onOpenLead={openLeadDetail}
            onStatusChange={async (lead, status) => {
              await api.admin.updateLead(lead.id || lead._id, { status, note: 'Moved via pipeline board' });
              flash(`Moved to ${status}`);
              load();
            }}
          />
        </div>
      )}

      {/* ─── DUPLICATES ─── */}
      {tab === 'duplicates' && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">Leads sharing the same phone number — review and merge or delete duplicates.</p>
          {duplicates.length === 0 && <div className="dm-card p-8 text-center text-stone-400">No duplicate phone numbers found</div>}
          {duplicates.map((group) => (
            <div key={group.phone} className="dm-card p-5">
              <p className="mb-3 font-mono font-semibold text-orange">📞 {group.phone}</p>
              <div className="space-y-2">
                {group.leads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
                    <div><span className="font-medium">{l.studentName}</span> · <span className="text-gold-dark">{l.leadId}</span> · {l.partnerName}</div>
                    <div className="flex gap-2">
                      <StatusBadge status={l.status} />
                      <button type="button" onClick={() => openLeadDetail(l)} className="text-xs text-blue-600">Open</button>
                      <button type="button" onClick={async () => { await api.admin.deleteLead(l.id); load(); }} className="text-xs text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'follow-ups' && <div className="dm-card p-6"><h2 className="mb-4 dm-section-title">Follow-up Management</h2><FollowUpList overdue={followUps.overdue} upcoming={followUps.upcoming} onSelect={openLeadDetail} /></div>}

      {/* ─── COMMISSIONS ─── */}
      {tab === 'commissions' && (
        <div className="space-y-4">
          <BulkActionBar selected={selectedCommissions} onClear={() => setSelectedCommissions([])} actions={[
            { label: 'Approve All', onClick: async () => { await api.admin.bulkCommissionAction(selectedCommissions, 'approved'); flash('Approved'); setSelectedCommissions([]); load(); } },
            { label: 'Mark Paid', onClick: async () => { await api.admin.bulkCommissionAction(selectedCommissions, 'paid'); flash('Paid'); setSelectedCommissions([]); load(); } },
          ]} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setCommissionModal(true)} className="dm-btn-primary"><Plus className="h-4 w-4" /> Add Manual Commission</button>
            <ExportButton href={api.admin.exportCommissions()} token={token} />
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr>
                <th><SelectCheckbox checked={selectedCommissions.length === commissions.length && commissions.length > 0} onChange={() => toggleAll(commissions, selectedCommissions, setSelectedCommissions)} /></th>
                <th>Partner</th><th>Lead</th><th>Amount</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id || c._id}>
                    <td><SelectCheckbox checked={selectedCommissions.includes(c.id || c._id)} onChange={() => setSelectedCommissions((s) => { const id = c.id || c._id; return s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; })} /></td>
                    <td>{c.partner?.name}</td>
                    <td className="font-mono text-gold-dark">{c.lead?.leadId} — {c.lead?.studentName}</td>
                    <td className="font-semibold text-emerald-600">{formatCurrency(c.amount)}</td>
                    <td><span className="dm-badge bg-stone-100 capitalize">{c.status}</span></td>
                    <td className="space-x-2">
                      {c.status === 'pending' && <button type="button" onClick={() => api.admin.updateCommission(c.id || c._id, { status: 'approved' }).then(load)} className="text-xs text-blue-600">Approve</button>}
                      {c.status === 'approved' && <button type="button" onClick={() => api.admin.updateCommission(c.id || c._id, { status: 'paid' }).then(load)} className="dm-btn-primary text-xs py-1">Pay</button>}
                      <button type="button" onClick={async () => { if (confirm('Delete?')) { await api.admin.deleteCommission(c.id || c._id); load(); } }} className="text-xs text-red-600"><Trash2 className="h-3 w-3 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && reports && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Conversion Rate" value={`${reports.conversionRate}%`} accent="green" />
            <StatCard label="Revenue Pipeline" value={formatCurrency(reports.revenuePipeline)} accent="gold" />
            <StatCard label="Partners" value={reports.partnerPerformance?.length} accent="blue" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="dm-card p-5"><h3 className="dm-section-title mb-4">12-Month Trend</h3><BarChart data={reports.monthlyTrends} color="orange" /></div>
            <div className="dm-card p-5"><h3 className="dm-section-title mb-4">Funnel</h3><ConversionFunnel data={reports.funnel} /></div>
          </div>
        </div>
      )}

      {tab === 'notify' && (
        <form onSubmit={async (e) => { e.preventDefault(); const res = await api.admin.notify(notifyForm); flash(`Sent to ${res.sent} partner(s)`); setNotifyForm({ partnerId: 'all', title: '', message: '', link: '' }); }} className="mx-auto max-w-xl dm-card space-y-4 p-6">
          <h2 className="dm-section-title flex items-center gap-2"><Send className="h-5 w-5" /> Send Notification</h2>
          <div><label className="dm-label">To</label><select className="dm-input" value={notifyForm.partnerId} onChange={(e) => setNotifyForm({ ...notifyForm, partnerId: e.target.value })}><option value="all">All Active Partners</option>{partners.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="dm-label">Title</label><input className="dm-input" value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} required /></div>
          <div><label className="dm-label">Message</label><textarea className="dm-input min-h-[100px]" value={notifyForm.message} onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} required /></div>
          <div><label className="dm-label">Link (optional)</label><input className="dm-input" placeholder="/partner?tab=leads" value={notifyForm.link} onChange={(e) => setNotifyForm({ ...notifyForm, link: e.target.value })} /></div>
          <button type="submit" className="dm-btn-primary w-full"><Send className="h-4 w-4" /> Send</button>
        </form>
      )}

      {tab === 'data' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="dm-card p-6">
            <h2 className="mb-4 dm-section-title">Bulk Lead Import (Admin)</h2>
            <select className="dm-input mb-4" value={bulkImportPartner} onChange={(e) => setBulkImportPartner(e.target.value)}>
              <option value="">Select partner</option>
              {partners.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <BulkLeadImport onImport={async (leadsData) => { if (!bulkImportPartner) { fail(new Error('Select a partner')); return; } const res = await api.admin.bulkLeads(bulkImportPartner, leadsData); flash(`Imported ${res.created} leads`); load(); }} />
          </div>
          <div className="dm-card p-6">
            <h2 className="mb-4 dm-section-title">Export Data</h2>
            <div className="space-y-3">
              <ExportButton href={api.admin.exportLeads()} token={token} label="Export All Leads" />
              <ExportButton href={api.admin.exportPartners()} token={token} label="Export All Partners" />
              <ExportButton href={api.admin.exportCommissions()} token={token} label="Export Commissions" />
            </div>
            {systemStats && (
              <div className="mt-6 rounded-xl bg-stone-50 p-4">
                <p className="mb-2 font-semibold text-stone-700">Database Stats</p>
                {Object.entries(systemStats).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="capitalize text-stone-500">{k}</span><span className="font-bold">{v}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'activity' && <div className="dm-card p-6"><h2 className="mb-4 dm-section-title">Full Activity Log</h2><ActivityFeed activities={activities} limit={100} /></div>}

      {tab === 'announcements' && (
        <div className="space-y-6">
          <form onSubmit={async (e) => { e.preventDefault(); await api.admin.createAnnouncement(announceForm); setAnnounceForm({ title: '', message: '' }); flash('Sent'); load(); }} className="dm-card space-y-4 p-6">
            <h2 className="dm-section-title">Broadcast Announcement</h2>
            <input className="dm-input" placeholder="Title" value={announceForm.title} onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })} required />
            <textarea className="dm-input min-h-[100px]" placeholder="Message..." value={announceForm.message} onChange={(e) => setAnnounceForm({ ...announceForm, message: e.target.value })} required />
            <button type="submit" className="dm-btn-primary">Send to All Partners</button>
          </form>
          {announcements.map((a) => (
            <div key={a.id} className="dm-card flex items-center justify-between p-4">
              <div><p className="font-semibold">{a.title}</p><p className="text-sm text-stone-600">{a.message}</p></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => api.admin.updateAnnouncement(a.id, { active: !a.active }).then(load)} className="dm-btn-ghost text-xs">{a.active !== false ? 'Hide' : 'Show'}</button>
                <button type="button" onClick={() => api.admin.deleteAnnouncement(a.id).then(load)} className="dm-btn-danger text-xs"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={async (e) => { e.preventDefault(); await api.admin.updateSettings(settings); flash('Settings saved'); }} className="mx-auto max-w-xl dm-card space-y-4 p-6">
          <h2 className="dm-section-title">CRM Settings</h2>
          {SETTINGS_FIELDS.map(({ key, label, type }) => (
            <div key={key}>
              <label className="dm-label">{label}</label>
              {type === 'textarea' ? <textarea className="dm-input" value={settings[key] || ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                : type === 'checkbox' ? <label className="flex items-center gap-2"><input type="checkbox" checked={settings[key] === true || settings[key] === 'true'} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} /> Enabled</label>
                : <input type={type} className="dm-input" value={settings[key] ?? ''} onChange={(e) => setSettings({ ...settings, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} />}
            </div>
          ))}
          <button type="submit" className="dm-btn-primary w-full">Save All Settings</button>
        </form>
      )}

      {/* ─── MODALS ─── */}
      <PartnerDetailModal partner={viewPartner} detail={partnerDetail} open={!!viewPartner} onClose={() => { setViewPartner(null); setPartnerDetail(null); }} onSave={savePartnerFromDetail} />

      <CredentialsModal
        open={!!credentialsData}
        onClose={() => setCredentialsData(null)}
        credentials={credentialsData?.credentials}
        partnerName={credentialsData?.name}
      />

      <Modal open={partnerModal} onClose={() => setPartnerModal(false)} title={editingPartner ? 'Edit Partner' : 'Create Partner Account'} wide>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (editingPartner) {
              await api.admin.updatePartner(editingPartner.id, partnerForm);
              flash('Partner updated');
              setPartnerModal(false);
              load();
            } else {
              if (!partnerForm.password || partnerForm.password.length < 6) {
                fail(new Error('Password is required (min 6 characters)'));
                return;
              }
              const res = await api.admin.createPartner(partnerForm);
              setPartnerModal(false);
              setCredentialsData({ credentials: res.credentials, name: res.partner.name });
              flash('Partner account created — share credentials below');
              load();
            }
          } catch (err) { fail(err); }
        }} className="space-y-5">
          {!editingPartner && (
            <div className="rounded-xl border border-orange/20 bg-orange/5 p-4 text-sm text-stone-700">
              Create login credentials for the partner. They will sign in using <strong>Partner ID</strong> or email with the password you set.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {['name', 'email', 'phone', 'organization', 'city', 'state', 'address'].map((f) => (
              <div key={f}><label className="dm-label capitalize">{f}</label><input className="dm-input" value={partnerForm[f] || ''} onChange={(e) => setPartnerForm({ ...partnerForm, [f]: e.target.value })} required={['name', 'email'].includes(f) && !editingPartner} disabled={f === 'email' && !!editingPartner} /></div>
            ))}
            <div>
              <label className="dm-label">Partner ID (login)</label>
              <div className="flex gap-2">
                <input className="dm-input font-mono uppercase" value={partnerForm.loginId || ''} onChange={(e) => setPartnerForm({ ...partnerForm, loginId: e.target.value.toUpperCase() })} placeholder="TCH-ABC123" required={!editingPartner} />
                {!editingPartner && (
                  <button type="button" className="dm-btn-ghost shrink-0 text-xs" onClick={() => setPartnerForm({ ...partnerForm, loginId: suggestLoginId(partnerForm.partnerType) })}>Generate</button>
                )}
              </div>
            </div>
            {!editingPartner && (
              <div>
                <label className="dm-label">Password *</label>
                <input className="dm-input" type="text" value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
              </div>
            )}
            <div><label className="dm-label">Type</label><select className="dm-input" value={partnerForm.partnerType} onChange={(e) => {
              const type = e.target.value;
              setPartnerForm({
                ...partnerForm,
                partnerType: type,
                loginId: !editingPartner ? suggestLoginId(type) : partnerForm.loginId,
                ...(type === 'franchise' ? { commissionRate: 15, tier: 'gold', royaltyPercent: 8 } : {}),
              });
            }}>{PARTNER_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            <div><label className="dm-label">Tier</label><select className="dm-input" value={partnerForm.tier} onChange={(e) => setPartnerForm({ ...partnerForm, tier: e.target.value })}>{PARTNER_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="dm-label">Commission %</label><input type="number" className="dm-input" value={partnerForm.commissionRate} onChange={(e) => setPartnerForm({ ...partnerForm, commissionRate: Number(e.target.value) })} /></div>
            <div><label className="dm-label">Status</label><select className="dm-input" value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}>{['pending', 'active', 'suspended', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            {partnerForm.partnerType === 'franchise' && (
              <>
                <div className="sm:col-span-2 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm font-semibold text-gold-dark">Franchise Details</div>
                <div><label className="dm-label">Franchise Name</label><input className="dm-input" value={partnerForm.franchiseName} onChange={(e) => setPartnerForm({ ...partnerForm, franchiseName: e.target.value })} /></div>
                <div><label className="dm-label">Territory</label><input className="dm-input" value={partnerForm.territory} onChange={(e) => setPartnerForm({ ...partnerForm, territory: e.target.value })} /></div>
                <div><label className="dm-label">Outlets</label><input type="number" min={1} className="dm-input" value={partnerForm.outletCount} onChange={(e) => setPartnerForm({ ...partnerForm, outletCount: Number(e.target.value) })} /></div>
                <div><label className="dm-label">Investment Tier</label><select className="dm-input" value={partnerForm.investmentTier} onChange={(e) => setPartnerForm({ ...partnerForm, investmentTier: e.target.value })}>{FRANCHISE_INVESTMENT_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label className="dm-label">Operating Model</label><select className="dm-input" value={partnerForm.operatingModel} onChange={(e) => setPartnerForm({ ...partnerForm, operatingModel: e.target.value })}>{FRANCHISE_OPERATING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                <div><label className="dm-label">Royalty %</label><input type="number" className="dm-input" value={partnerForm.royaltyPercent} onChange={(e) => setPartnerForm({ ...partnerForm, royaltyPercent: Number(e.target.value) })} /></div>
                <div><label className="dm-label">Agreement Date</label><input type="date" className="dm-input" value={partnerForm.agreementDate} onChange={(e) => setPartnerForm({ ...partnerForm, agreementDate: e.target.value })} /></div>
              </>
            )}
            <div className="sm:col-span-2"><label className="dm-label">Admin Notes</label><textarea className="dm-input" value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} /></div>
          </div>
          <button type="submit" className="dm-btn-primary w-full">{editingPartner ? 'Save Changes' : 'Create Partner & Get Credentials'}</button>
        </form>
      </Modal>

      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={`Lead ${selectedLead?.leadId}`} wide>
        {selectedLead && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <button key={s.value} type="button" onClick={() => setLeadUpdate({ ...leadUpdate, status: s.value })} className={`rounded-lg px-3 py-1 text-xs font-medium ${leadUpdate.status === s.value ? 'bg-orange text-white' : 'bg-stone-100 text-stone-600'}`}>{s.label}</button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="dm-label">Follow-up</label><input type="date" className="dm-input" value={leadUpdate.followUpDate} onChange={(e) => setLeadUpdate({ ...leadUpdate, followUpDate: e.target.value })} /></div>
              <div><label className="dm-label">Priority</label><select className="dm-input" value={leadUpdate.priority} onChange={(e) => setLeadUpdate({ ...leadUpdate, priority: e.target.value })}>{['low','medium','high'].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="dm-label">Expected Value ₹</label><input type="number" className="dm-input" value={leadUpdate.expectedValue} onChange={(e) => setLeadUpdate({ ...leadUpdate, expectedValue: Number(e.target.value) })} /></div>
              <div><label className="dm-label">Tags (comma)</label><input className="dm-input" value={leadUpdate.tags} onChange={(e) => setLeadUpdate({ ...leadUpdate, tags: e.target.value })} /></div>
            </div>
            <div><label className="dm-label">Status Note</label><input className="dm-input" value={leadUpdate.note} onChange={(e) => setLeadUpdate({ ...leadUpdate, note: e.target.value })} /></div>
            <div><label className="dm-label">Admin Notes (partner sees)</label><textarea className="dm-input" value={leadUpdate.adminNotes} onChange={(e) => setLeadUpdate({ ...leadUpdate, adminNotes: e.target.value })} /></div>

            <details className="rounded-xl border border-stone-200 p-4">
              <summary className="cursor-pointer font-semibold text-stone-800">Edit Student Details</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {['studentName','studentPhone','studentEmail','classGrade','city'].map((f) => (
                  <div key={f}><label className="dm-label capitalize">{f.replace('student','')}</label><input className="dm-input" value={leadEditForm[f] || ''} onChange={(e) => setLeadEditForm({ ...leadEditForm, [f]: e.target.value })} /></div>
                ))}
              </div>
              <button type="button" onClick={async () => { await api.admin.editLead(selectedLead.id || selectedLead._id, leadEditForm); flash('Student details saved'); }} className="dm-btn-ghost mt-3 text-sm">Save Student Details</button>
            </details>

            <details className="rounded-xl border border-stone-200 p-4">
              <summary className="cursor-pointer font-semibold text-stone-800">Transfer to Another Partner</summary>
              <div className="mt-4 flex gap-2">
                <select className="dm-input flex-1" value={transferPartnerId} onChange={(e) => setTransferPartnerId(e.target.value)}>
                  <option value="">Select partner</option>
                  {partners.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" disabled={!transferPartnerId} onClick={async () => { await api.admin.transferLead(selectedLead.id || selectedLead._id, transferPartnerId); flash('Transferred'); setSelectedLead(null); load(); }} className="dm-btn-primary">Transfer</button>
              </div>
            </details>

            <div className="flex gap-2">
              <button type="button" onClick={async () => { await api.admin.updateLead(selectedLead.id || selectedLead._id, { ...leadUpdate, tags: leadUpdate.tags ? leadUpdate.tags.split(',').map((t) => t.trim()) : [] }); flash('Updated'); setSelectedLead(null); load(); }} className="dm-btn-primary flex-1">Save All Changes</button>
              <button type="button" onClick={() => deleteLead(selectedLead)} className="dm-btn-danger">Delete</button>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="mb-2 font-semibold">Comments</p>
              <LeadComments comments={leadComments} canAddInternal onAdd={(msg, internal) => api.admin.addComment(selectedLead.id || selectedLead._id, msg, internal).then(() => openLeadDetail(selectedLead))} />
            </div>
          </div>
        )}
      </Modal>

      <Modal open={leadModal} onClose={() => setLeadModal(false)} title="Create Lead" wide>
        <select className="dm-input mb-4" value={adminLeadForm.partnerId} onChange={(e) => setAdminLeadForm({ ...adminLeadForm, partnerId: e.target.value })}>
          <option value="">Select partner</option>
          {partners.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <LeadForm form={adminLeadForm} onChange={setAdminLeadForm} onSubmit={async (e) => { e.preventDefault(); await api.admin.createLead(adminLeadForm); setLeadModal(false); flash('Created'); load(); }} />
      </Modal>

      <Modal open={commissionModal} onClose={() => setCommissionModal(false)} title="Add Manual Commission">
        <form onSubmit={async (e) => { e.preventDefault(); await api.admin.createCommission(commissionForm); setCommissionModal(false); flash('Commission added'); load(); }} className="space-y-4">
          <div><label className="dm-label">Partner</label><select className="dm-input" value={commissionForm.partnerId} onChange={(e) => setCommissionForm({ ...commissionForm, partnerId: e.target.value })} required>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="dm-label">Lead ID (internal)</label><select className="dm-input" value={commissionForm.leadId} onChange={(e) => setCommissionForm({ ...commissionForm, leadId: e.target.value })} required>{leads.map((l) => <option key={l.id || l._id} value={l.id || l._id}>{l.leadId} — {l.studentName}</option>)}</select></div>
          <div><label className="dm-label">Amount ₹</label><input type="number" className="dm-input" value={commissionForm.amount} onChange={(e) => setCommissionForm({ ...commissionForm, amount: e.target.value })} required /></div>
          <div><label className="dm-label">Notes</label><input className="dm-input" value={commissionForm.notes} onChange={(e) => setCommissionForm({ ...commissionForm, notes: e.target.value })} /></div>
          <button type="submit" className="dm-btn-primary w-full">Create Commission</button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
