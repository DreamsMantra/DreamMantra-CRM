import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
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
import ChatMessenger from '../components/ChatMessenger';
import PartnerProfilePage from '../components/admin/PartnerProfilePage';
import { playDuplicateBuzz } from '../utils/duplicateBuzz';

const AdminToolsPanel = lazy(() => import('../features/admin/panels/AdminToolsPanel'));

function PanelFallback() {
  return (
    <div className="dm-card flex min-h-[12rem] items-center justify-center p-8 text-sm text-stone-500">
      Loading…
    </div>
  );
}

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [params, setParams] = useSearchParams();
  const { rawTab, tab, sub, inner: innerSub, alias } = resolveAdminRoute(params);
  const pageInfo = PAGE_TITLES[tab] || { title: tab, desc: '' };
  const partnerProfileId = tab === 'partners' ? params.get('partnerId') : null;

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
  const [leadDateFrom, setLeadDateFrom] = useState('');
  const [leadDateTo, setLeadDateTo] = useState('');
  const [leadAssigneeFilter, setLeadAssigneeFilter] = useState('all');
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
  const fail = (err) => {
    const msg = err?.message || 'Error';
    if (/duplicate/i.test(msg) || err?.data?.duplicates) playDuplicateBuzz();
    setError(msg);
  };

  const attentionItems = [];
  if (dashboard?.stats?.pendingPartners > 0) {
    attentionItems.push({
      id: 'pending-partners',
      type: 'partners',
      title: `${dashboard.stats.pendingPartners} partner(s) waiting approval`,
      desc: 'Review and approve registrations',
      tone: 'bg-amber-50 text-amber-700',
      tab: 'partners',
      opts: { partnerFilter: 'pending' },
    });
  }
  if (followUps.overdue?.length > 0) {
    attentionItems.push({
      id: 'overdue-followups',
      type: 'followups',
      title: `${followUps.overdue.length} overdue follow-up(s)`,
      desc: 'Leads that need immediate contact',
      tone: 'bg-red-50 text-red-700',
      tab: 'leads',
      opts: { panel: 'followups' },
    });
  }
  if (duplicates.length > 0) {
    attentionItems.push({
      id: 'duplicates',
      type: 'duplicates',
      title: `${duplicates.length} duplicate phone group(s)`,
      desc: 'Merge or clean duplicate leads',
      tone: 'bg-orange/10 text-orange',
      tab: 'leads',
      opts: { panel: 'duplicates' },
    });
  }
  const attentionCount = attentionItems.length;

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

      // Keep badge counts fresh without reloading heavy lists on every tab
      if (forceAll || ['overview', 'leads', 'partners', 'students', 'finance', 'reports', 'tools'].includes(tab)) {
        tasks.push(safe(() => api.admin.dashboard(), null).then((d) => { if (d) setDashboard(d); }));
        tasks.push(safe(() => api.admin.followUps(), { overdue: [], upcoming: [], today: [] }).then(setFollowUps));
      }

      if (forceAll || ['partners', 'leads', 'finance', 'team', 'tools', 'students', 'messages'].includes(tab)) {
        const partnerParams = { status: tab === 'partners' ? partnerFilter : 'all', partnerType: tab === 'partners' ? partnerTypeFilter : 'all' };
        if (tab === 'partners' && searchQuery) partnerParams.search = searchQuery;
        tasks.push(safe(() => api.admin.partners(partnerParams), { partners: [] })
          .then((d) => setPartners(d.partners || [])));
      }

      if (forceAll || ['leads', 'students', 'team', 'finance', 'tools'].includes(tab)) {
        const leadTypeParam = tab === 'leads' && leadTypeFilter !== 'all' ? leadTypeFilter : undefined;
        tasks.push(safe(() => api.admin.leads({
          status: tab === 'leads' ? leadFilter : 'all',
          partnerId: tab === 'leads' ? leadPartnerFilter : 'all',
          priority: tab === 'leads' ? leadPriorityFilter : 'all',
          search: tab === 'leads' ? searchQuery : undefined,
          leadType: leadTypeParam,
        }), { leads: [] }).then((d) => setLeads(d.leads || [])));
      }

      if (forceAll || tab === 'leads' || tab === 'overview') {
        tasks.push(safe(() => api.admin.duplicates(), { groups: [] }).then((d) => setDuplicates(d.groups || [])));
      }

      if (forceAll || tab === 'finance') {
        tasks.push(safe(() => api.admin.commissions(), { commissions: [] }).then((d) => setCommissions(d.commissions || [])));
      }

      if (forceAll || tab === 'reports') {
        tasks.push(safe(() => api.admin.reports(), null).then((r) => { if (r) setReports(r); }));
      }
      if (forceAll || tab === 'overview') {
        tasks.push(safe(() => api.admin.activity(), { activities: [] }).then((a) => setActivities(a.activities || [])));
      }
      if (forceAll || tab === 'settings' || tab === 'tools') {
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
    if (lead?.kind === 'activity' && lead.partnerId) {
      setParams({ tab: 'partners', partnerId: lead.partnerId, inner: 'activity' });
      return;
    }
    const id = lead?.id || lead?._id;
    let full = lead;
    if (id && !lead?.studentName && !lead?.companyName && !lead?.status) {
      full = leads.find((l) => (l.id || l._id) === id) || lead;
      if (!full?.status) {
        try {
          const res = await api.admin.getLead(id);
          full = res.lead || res;
        } catch { /* use thin object */ }
      }
    }
    setSelectedLead(full);
    setLeadUpdate({
      status: full.status, adminNotes: full.adminNotes || '', note: '',
      expectedValue: full.expectedValue || 5000, priority: full.priority,
      followUpDate: full.followUpDate?.slice?.(0, 10) || '', tags: (full.tags || []).join(', '),
    });
    setLeadEditForm({
      leadType: full.leadType || 'student',
      studentName: full.studentName || '', studentPhone: full.studentPhone || '',
      studentEmail: full.studentEmail || '', classGrade: full.classGrade || '',
      parentName: full.parentName || '', parentPhone: full.parentPhone || '',
      stream: full.stream || '', schoolCollege: full.schoolCollege || '',
      city: full.city || '', state: full.state || '', pincode: full.pincode || '',
      companyName: full.companyName || '', contactPerson: full.contactPerson || '',
      contactPhone: full.contactPhone || full.studentPhone || '',
      contactEmail: full.contactEmail || full.studentEmail || '',
      businessType: full.businessType || '', estimatedStudents: full.estimatedStudents || '',
      dealValue: full.dealValue || full.expectedValue || '',
      notes: full.notes || '', priority: full.priority || 'medium',
      interestedIn: full.interestedIn || [], gender: full.gender || '',
      dateOfBirth: full.dateOfBirth || '', budget: full.budget || '',
      preferredContactTime: full.preferredContactTime || '',
      whatsappOptIn: full.whatsappOptIn !== false,
    });
    setTransferPartnerId('');
    try {
      const { comments } = await api.admin.leadComments(full.id || full._id || id);
      setLeadComments(comments);
    } catch { setLeadComments([]); }
  };

  const viewPartnerDetail = async (p) => {
    setParams({ tab: 'partners', partnerId: p.id, inner: 'overview' });
  };

  const closePartnerProfile = () => {
    setParams({ tab: 'partners' });
    setViewPartner(null);
    setPartnerDetail(null);
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
      ...(asAgency ? { tier: 'gold', royaltyPercent: 8 } : {}),
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
      const next = { tab: 'partners' };
      if (opts.partnerFilter) setPartnerFilter(opts.partnerFilter);
      if (opts.partnerId) next.partnerId = opts.partnerId;
      setParams(next);
    } else if (t === 'finance') setParams({ tab: 'finance', sub: opts.sub || 'commissions' });
    else if (t === 'team') setParams({ tab: 'team', inner: opts.inner || 'users' });
    else if (t === 'settings') setParams({ tab: 'settings', inner: opts.inner || 'general' });
    else setParams({ tab: t });
  };

  const setSub = (s) => setParams({ tab: 'finance', sub: s });
  const setInner = (s) => setParams({ tab, inner: s });

  const openQuickLead = async (leadType = 'student') => {
    const activeId = partners.find((p) => p.status === 'active')?.id || '';
    setAdminLeadForm({ ...emptyLeadForm, partnerId: activeId, leadType });
    setLeadModal(true);
    try {
      const d = await api.admin.partners({ status: 'active' });
      const list = d.partners || [];
      if (list.length) {
        setPartners((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          list.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
        if (!activeId) {
          setAdminLeadForm((f) => ({ ...f, partnerId: list[0].id }));
        }
      }
    } catch { /* keep cached partners */ }
  };

  const panelProps = {
    pageInfo, dashboard, activities, duplicates, enterprise, reports, partners, leads, commissions,
    followUps, staffUsers, token, sub, innerSub, leadViewMode, setLeadViewMode, leadsPanel, setLeadsPanel,
    leadTypeFilter, setLeadTypeFilter, leadFilter, setLeadFilter, leadPartnerFilter, setLeadPartnerFilter,
    leadPriorityFilter, setLeadPriorityFilter, leadDateFrom, setLeadDateFrom, leadDateTo, setLeadDateTo,
    leadAssigneeFilter, setLeadAssigneeFilter,
    search, setSearch, partnerFilter, setPartnerFilter, partnerTypeFilter, setPartnerTypeFilter,
    selectedPartners, setSelectedPartners, selectedLeads, setSelectedLeads, selectedCommissions, setSelectedCommissions,
    settings, setSettings, notifyForm, setNotifyForm, bulkImportPartner, setBulkImportPartner,
    load: refresh, flash, fail, toggleAll, bulkLeads, setTab, setSub, setInner, onTab: setTab,
    onQuickLead: openQuickLead, openQuickLead, onPartnerCreate: openPartnerCreate, onOpenLead: openLeadDetail,
    openLeadDetail, viewPartnerDetail, deletePartner, resetPassword,
    setEditingPartner, setPartnerForm, setPartnerModal, setCommissionModal, setEditCommission,
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      activeTab={tab}
      onTabChange={setTab}
      title={partnerProfileId ? 'Partner Profile' : pageInfo.title}
      badge={attentionCount || dashboard?.stats?.pendingPartners || 0}
      notificationItems={attentionItems}
      onNotificationClick={(item) => setTab(item.tab, item.opts || {})}
      onNotificationMarkAll={() => setTab('partners', { partnerFilter: 'pending' })}
      headerActions={(
        <div className="flex items-center gap-2">
          <button type="button" className="dm-btn-primary text-xs" onClick={() => openQuickLead()}><Plus className="h-3 w-3" /> Add Lead</button>
          <AdminGlobalSearch
            onSelectPartner={(p) => { setTab('partners', { partnerId: p.id }); }}
            onSelectLead={(l) => { setTab('leads'); openLeadDetail(l); }}
          />
        </div>
      )}
    >
      {message && <div className="dm-alert-success mb-4"><CheckCircle className="h-4 w-4" /> {message}</div>}
      {error && <div className="dm-alert-error mb-4"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {tab === 'overview' && <AdminOverviewPanel {...panelProps} />}
      {tab === 'partners' && partnerProfileId && (
        <PartnerProfilePage
          partnerId={partnerProfileId}
          onBack={closePartnerProfile}
          onOpenLead={(l) => { openLeadDetail(l); }}
          onMessage={() => setTab('messages')}
          flash={flash}
          fail={fail}
          resetPassword={resetPassword}
          profileTab={innerSub || 'overview'}
          onProfileTab={(id) => setParams({ tab: 'partners', partnerId: partnerProfileId, inner: id })}
        />
      )}
      {tab === 'partners' && !partnerProfileId && <AdminPartnersPanel {...panelProps} />}
      {tab === 'leads' && <AdminLeadsPanel {...panelProps} />}
      {tab === 'students' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <StudentsPanel staffUsers={staffUsers} partners={partners} onEditLead={openLeadDetail} embedded />
        </DashboardSection>
      )}
      {tab === 'finance' && <AdminFinancePanel {...panelProps} />}
      {tab === 'reports' && <AdminReportsPanel {...panelProps} />}
      {tab === 'team' && <AdminTeamPanel {...panelProps} />}
      {tab === 'messages' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <ChatMessenger isAdmin partners={partners} onPartnersRefresh={refresh} />
        </DashboardSection>
      )}
      {tab === 'tools' && (
        <Suspense fallback={<PanelFallback />}>
          <AdminToolsPanel {...panelProps} />
        </Suspense>
      )}
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
