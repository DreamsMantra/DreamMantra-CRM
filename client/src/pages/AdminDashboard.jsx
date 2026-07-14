import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import DashboardSection from '../components/layout/DashboardSection';
import AdminGlobalSearch from '../components/AdminGlobalSearch';
import StudentsPanel from '../components/admin/StudentsPanel';
import LeadForm, { emptyLeadForm } from '../components/LeadForm';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { getNavForRole } from '../config/roleNavigation';
import { ADMIN_TAB_IDS, PAGE_TITLES, resolveAdminRoute } from '../config/adminTabs';
import { emptyPartner, suggestLoginId } from '../features/admin/constants';
import AdminOverviewPanel from '../features/admin/panels/AdminOverviewPanel';
import AdminPartnersPanel from '../features/admin/panels/AdminPartnersPanel';
import AdminLeadsPanel from '../features/admin/panels/AdminLeadsPanel';
import AdminFinancePanel, { AdminReportsPanel } from '../features/admin/panels/AdminFinancePanel';
import AdminTeamPanel from '../features/admin/panels/AdminTeamPanel';
import AdminSettingsPanel from '../features/admin/panels/AdminSettingsPanel';
import AdminModals from '../features/admin/AdminModals';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [params, setParams] = useSearchParams();
  const { rawTab, tab, sub, inner: innerSub, alias } = resolveAdminRoute(params);
  const pageInfo = PAGE_TITLES[tab] || { title: tab, desc: '' };

  const [leadViewMode, setLeadViewMode] = useState('list');
  const [leadsPanel, setLeadsPanel] = useState('none');
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followUps, setFollowUps] = useState({ overdue: [], upcoming: [], today: [] });
  const [settings, setSettings] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [enterprise, setEnterprise] = useState(null);
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

  const [notifyForm, setNotifyForm] = useState({ partnerId: 'all', title: '', message: '', link: '' });
  const [commissionForm, setCommissionForm] = useState({ partnerId: '', leadId: '', amount: '', rate: 10, notes: '' });
  const [commissionModal, setCommissionModal] = useState(false);
  const [editCommission, setEditCommission] = useState(null);
  const [leadTemplateFields, setLeadTemplateFields] = useState([]);
  const [bulkImportPartner, setBulkImportPartner] = useState('');

  const [partnerFilter, setPartnerFilter] = useState('all');
  const [partnerTypeFilter, setPartnerTypeFilter] = useState('all');
  const [leadFilter, setLeadFilter] = useState('all');
  const [leadPartnerFilter, setLeadPartnerFilter] = useState('all');
  const [leadPriorityFilter, setLeadPriorityFilter] = useState('all');
  const [leadTypeFilter, setLeadTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffUsers, setStaffUsers] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!alias) return;
    if (alias.tab === 'leads') {
      if (params.get('tab') !== 'leads') setParams({ tab: 'leads' });
      if (alias.view) setLeadViewMode(alias.view);
      if (alias.leadType) setLeadTypeFilter(alias.leadType);
      if (alias.panel) setLeadsPanel(alias.panel);
      return;
    }
    if (alias.tab === 'partners' && alias.partnerType) {
      setPartnerTypeFilter(alias.partnerType);
      if (params.get('tab') !== 'partners') setParams({ tab: 'partners' });
      return;
    }
    const next = { tab: alias.tab };
    if (alias.sub) next.sub = alias.sub;
    if (alias.inner) next.inner = alias.inner;
    if (params.get('tab') !== next.tab || (next.sub && params.get('sub') !== next.sub) || (next.inner && params.get('inner') !== next.inner)) {
      setParams(next);
    }
  }, [rawTab]);

  useEffect(() => {
    if (tab === 'team' && user?.role && user.role !== 'super_admin') {
      setParams({ tab: 'overview' });
    }
  }, [tab, user?.role]);

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };
  const fail = (err) => setError(err.message || 'Error');

  const sidebarLinks = getNavForRole(user?.role || 'super_admin').map((l) => ({
    ...l,
    badge: l.tab === 'leads' ? (followUps.overdue?.length || 0) + (duplicates.length || 0)
      : l.tab === 'partners' ? dashboard?.stats?.pendingPartners
      : 0,
  }));

  useEffect(() => {
    api.auth.formTemplate('lead').then((r) => setLeadTemplateFields(r.fields || [])).catch(() => {});
  }, []);

  const load = useCallback(async (opts = {}) => {
    setError('');
    const safe = async (fn, fallback) => {
      try { return await fn(); } catch { return fallback; }
    };
    const forceAll = !!opts.force;
    try {
      const tasks = [];

      // Always keep dashboard badges fresh on main work tabs
      if (forceAll || ['overview', 'leads', 'partners', 'students', 'finance', 'reports'].includes(tab)) {
        tasks.push(safe(() => api.admin.dashboard(), null).then((d) => { if (d) setDashboard(d); }));
        tasks.push(safe(() => api.admin.followUps(), { overdue: [], upcoming: [], today: [] }).then(setFollowUps));
      }

      if (forceAll || ['overview', 'partners', 'leads', 'finance', 'team', 'settings', 'students'].includes(tab)) {
        const pStatus = tab === 'partners' ? partnerFilter : (forceAll ? partnerFilter : 'all');
        const pType = tab === 'partners' ? partnerTypeFilter : 'all';
        const pSearch = tab === 'partners' ? searchQuery : undefined;
        tasks.push(safe(() => api.admin.partners({ status: pStatus, partnerType: pType, search: pSearch }), { partners: [] })
          .then((d) => setPartners(d.partners || [])));
      }

      if (forceAll || ['overview', 'leads', 'students', 'team', 'finance'].includes(tab)) {
        const leadTypeParam = tab === 'leads' && leadTypeFilter !== 'all' ? leadTypeFilter : undefined;
        tasks.push(safe(() => api.admin.leads({
          status: tab === 'leads' ? leadFilter : 'all',
          partnerId: tab === 'leads' ? leadPartnerFilter : 'all',
          priority: tab === 'leads' ? leadPriorityFilter : 'all',
          search: tab === 'leads' ? searchQuery : undefined,
          leadType: leadTypeParam,
        }), { leads: [] }).then((d) => setLeads(d.leads || [])));
      }

      if (forceAll || tab === 'leads') {
        tasks.push(safe(() => api.admin.duplicates(), { groups: [] }).then((d) => setDuplicates(d.groups || [])));
      }

      if (forceAll || tab === 'finance') {
        tasks.push(safe(() => api.admin.commissions(), { commissions: [] }).then((d) => setCommissions(d.commissions || [])));
      }

      if (forceAll || tab === 'reports' || tab === 'overview') {
        tasks.push(safe(() => api.admin.reports(), null).then((r) => { if (r) setReports(r); }));
      }
      if (forceAll || tab === 'overview') {
        tasks.push(safe(() => api.admin.activity(), { activities: [] }).then((a) => setActivities(a.activities || [])));
      }
      if (forceAll || tab === 'settings') {
        tasks.push(safe(() => api.admin.system(), { settings: {}, stats: {} }).then((sys) => setSettings(sys.settings || {})));
      }
      if (user?.role === 'super_admin' && (forceAll || tab === 'overview' || tab === 'team' || tab === 'students')) {
        tasks.push(safe(() => api.admin.users(), { users: [] }).then((u) => setStaffUsers(u.users || [])));
        if (forceAll || tab === 'overview') {
          tasks.push(safe(() => api.admin.enterprise(), { stats: null }).then((ent) => { if (ent?.stats) setEnterprise(ent.stats); }));
        }
      }

      await Promise.all(tasks);
    } catch (err) { fail(err); }
  }, [tab, partnerFilter, partnerTypeFilter, leadFilter, leadPartnerFilter, leadPriorityFilter, leadTypeFilter, searchQuery, user?.role]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load({ force: true }), [load]);
  const openLeadDetail = async (lead) => {
    setSelectedLead(lead);
    setLeadUpdate({
      status: lead.status, adminNotes: lead.adminNotes || '', note: '',
      expectedValue: lead.expectedValue || 5000, priority: lead.priority,
      followUpDate: lead.followUpDate?.slice?.(0, 10) || '', tags: (lead.tags || []).join(', '),
    });
    setLeadEditForm({
      leadType: lead.leadType || 'student',
      studentName: lead.studentName || '', studentPhone: lead.studentPhone || '',
      studentEmail: lead.studentEmail || '', classGrade: lead.classGrade || '',
      parentName: lead.parentName || '', parentPhone: lead.parentPhone || '',
      stream: lead.stream || '', schoolCollege: lead.schoolCollege || '',
      city: lead.city || '', state: lead.state || '', pincode: lead.pincode || '',
      companyName: lead.companyName || '', contactPerson: lead.contactPerson || '',
      contactPhone: lead.contactPhone || lead.studentPhone || '',
      contactEmail: lead.contactEmail || lead.studentEmail || '',
      businessType: lead.businessType || '', estimatedStudents: lead.estimatedStudents || '',
      dealValue: lead.dealValue || lead.expectedValue || '',
      notes: lead.notes || '', priority: lead.priority || 'medium',
      interestedIn: lead.interestedIn || [], gender: lead.gender || '',
      dateOfBirth: lead.dateOfBirth || '', budget: lead.budget || '',
      preferredContactTime: lead.preferredContactTime || '',
      whatsappOptIn: lead.whatsappOptIn !== false,
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
    refresh();
  };

  const deletePartner = async (p) => {
    if (!confirm(`Delete partner "${p.name}"? Their leads will remain but partner account is removed.`)) return;
    await api.admin.deletePartner(p.id);
    flash('Partner deleted');
    refresh();
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

  const bulkLeads = async (status) => {
    await api.admin.bulkLeadAction({ ids: selectedLeads, status });
    flash(`${selectedLeads.length} leads updated`);
    setSelectedLeads([]);
    refresh();
  };

  const deleteLead = async (lead) => {
    if (!confirm(`Delete lead ${lead.studentName}?`)) return;
    await api.admin.deleteLead(lead.id || lead._id);
    flash('Lead deleted');
    setSelectedLead(null);
    refresh();
  };

  const openPartnerCreate = (asAgency = false) => {
    setEditingPartner(null);
    const type = asAgency ? 'agency' : emptyPartner.partnerType;
    setPartnerForm({
      ...emptyPartner,
      partnerType: type,
      loginId: suggestLoginId(type),
      password: 'Partner@123',
      ...(asAgency ? { commissionRate: 15, tier: 'gold', royaltyPercent: 8 } : {}),
    });
    setPartnerModal(true);
  };

  const toggleAll = (items, selected, setSelected) => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((i) => i.id || i._id));
  };

  const setTab = (t, opts = {}) => {
    if (t === 'overview') setParams({});
    else if (t === 'leads') {
      setParams({ tab: 'leads' });
      if (opts.view) setLeadViewMode(opts.view);
      if (opts.leadType) setLeadTypeFilter(opts.leadType);
      if (opts.panel) setLeadsPanel(opts.panel);
    } else if (t === 'partners') {
      setParams({ tab: 'partners' });
      if (opts.partnerFilter) setPartnerFilter(opts.partnerFilter);
    } else if (t === 'finance') setParams({ tab: 'finance', sub: opts.sub || 'commissions' });
    else if (t === 'team') setParams({ tab: 'team', inner: opts.inner || 'users' });
    else if (t === 'settings') setParams({ tab: 'settings', inner: opts.inner || 'general' });
    else setParams({ tab: t });
  };

  const setSub = (s) => setParams({ tab: 'finance', sub: s });
  const setInner = (s) => setParams({ tab, inner: s });

  const openQuickLead = (leadType = 'student') => {
    setAdminLeadForm({ ...emptyLeadForm, partnerId: partners.find((p) => p.status === 'active')?.id || '', leadType });
    setLeadModal(true);
  };

  const panelProps = {
    pageInfo, dashboard, activities, duplicates, enterprise, reports, partners, leads, commissions,
    followUps, staffUsers, token, sub, innerSub, leadViewMode, setLeadViewMode, leadsPanel, setLeadsPanel,
    leadTypeFilter, setLeadTypeFilter, leadFilter, setLeadFilter, leadPartnerFilter, setLeadPartnerFilter,
    search, setSearch, partnerFilter, setPartnerFilter, partnerTypeFilter, setPartnerTypeFilter,
    selectedPartners, setSelectedPartners, selectedLeads, setSelectedLeads, selectedCommissions, setSelectedCommissions,
    settings, setSettings, notifyForm, setNotifyForm, bulkImportPartner, setBulkImportPartner,
    load: refresh, flash, fail, toggleAll, bulkLeads, setTab, setSub, setInner,
    onQuickLead: openQuickLead, onPartnerCreate: openPartnerCreate, onOpenLead: openLeadDetail,
    openLeadDetail, viewPartnerDetail, deletePartner, resetPassword,
    setEditingPartner, setPartnerForm, setPartnerModal, setCommissionModal, setEditCommission,
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      activeTab={tab}
      onTabChange={setTab}
      title={pageInfo.title}
      badge={dashboard?.stats?.pendingPartners}
      headerActions={(
        <div className="flex items-center gap-2">
          <button type="button" className="dm-btn-primary text-xs" onClick={() => openQuickLead()}><Plus className="h-3 w-3" /> Add Lead</button>
          <AdminGlobalSearch
            onSelectPartner={(p) => { setTab('partners'); viewPartnerDetail(p); }}
            onSelectLead={(l) => { setTab('leads'); openLeadDetail(l); }}
          />
        </div>
      )}
    >
      {message && <div className="dm-alert-success mb-4"><CheckCircle className="h-4 w-4" /> {message}</div>}
      {error && <div className="dm-alert-error mb-4"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {tab === 'overview' && <AdminOverviewPanel {...panelProps} />}
      {tab === 'partners' && <AdminPartnersPanel {...panelProps} />}
      {tab === 'leads' && <AdminLeadsPanel {...panelProps} />}
      {tab === 'students' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <StudentsPanel staffUsers={staffUsers} onEditLead={openLeadDetail} embedded />
        </DashboardSection>
      )}
      {tab === 'finance' && <AdminFinancePanel {...panelProps} />}
      {tab === 'reports' && <AdminReportsPanel {...panelProps} />}
      {tab === 'team' && <AdminTeamPanel {...panelProps} />}
      {tab === 'settings' && <AdminSettingsPanel {...panelProps} />}

      {!ADMIN_TAB_IDS.includes(tab) && (
        <div className="dm-card p-12 text-center">
          <p className="text-stone-600">Page not found.</p>
          <button type="button" className="dm-btn-primary mt-4" onClick={() => setTab('overview')}>Go Home</button>
        </div>
      )}

      <AdminModals
        viewPartner={viewPartner} setViewPartner={setViewPartner} partnerDetail={partnerDetail} setPartnerDetail={setPartnerDetail}
        savePartnerFromDetail={savePartnerFromDetail} credentialsData={credentialsData} setCredentialsData={setCredentialsData}
        partnerModal={partnerModal} setPartnerModal={setPartnerModal} editingPartner={editingPartner}
        partnerForm={partnerForm} setPartnerForm={setPartnerForm} flash={flash} fail={fail} load={refresh}
        selectedLead={selectedLead} setSelectedLead={setSelectedLead} leadUpdate={leadUpdate} setLeadUpdate={setLeadUpdate}
        leadEditForm={leadEditForm} setLeadEditForm={setLeadEditForm} leadTemplateFields={leadTemplateFields}
        transferPartnerId={transferPartnerId} setTransferPartnerId={setTransferPartnerId} partners={partners}
        leadComments={leadComments} openLeadDetail={openLeadDetail} deleteLead={deleteLead}
        leadModal={leadModal} setLeadModal={setLeadModal} adminLeadForm={adminLeadForm} setAdminLeadForm={setAdminLeadForm}
        commissionModal={commissionModal} setCommissionModal={setCommissionModal} commissionForm={commissionForm}
        setCommissionForm={setCommissionForm} editCommission={editCommission} setEditCommission={setEditCommission} leads={leads}
      />
    </DashboardLayout>
  );
}
