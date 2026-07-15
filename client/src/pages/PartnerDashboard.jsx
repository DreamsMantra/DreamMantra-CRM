import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardSection from '../components/layout/DashboardSection';
import SectionBlock from '../components/layout/SectionBlock';
import { resolvePartnerRoute, getPartnerGroups } from '../config/partnerTabs';
import {
  LayoutDashboard, Users, IndianRupee, UserCircle, Plus, Search, Copy, CheckCircle,
  Clock, AlertCircle, Bell, BarChart3, Trophy, Calendar, Upload, CreditCard, Lock,
  MessageCircle, Download, TrendingUp, Store,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LeadForm, { emptyLeadForm } from '../components/LeadForm';
import BarChart from '../components/charts/BarChart';
import AnnouncementBanner from '../components/AnnouncementBanner';
import Leaderboard from '../components/Leaderboard';
import FollowUpList from '../components/FollowUpList';
import BulkLeadImport from '../components/BulkLeadImport';
import ExportButton from '../components/ExportButton';
import LeadComments from '../components/LeadComments';
import AgencyHub from '../components/AgencyHub';
import ChatMessenger from '../components/ChatMessenger';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, getDashboardTitle, AGENCY_TYPES } from '../config/roleNavigation';
import { leadDisplayName, leadDisplayPhone } from '../config/adminTabs';
import { LEAD_STATUSES, formatDate, formatCurrency, partnerTypeLabel, PARTNER_TIERS } from '../utils/constants';
import { playDuplicateBuzz } from '../utils/duplicateBuzz';

function ResourceLinkCards({ items, emptyLabel = 'No resources available yet' }) {
  if (!items?.length) {
    return <p className="dm-card p-8 text-center text-sm text-stone-400">{emptyLabel}</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((m) => (
        <a
          key={m.id || `${m.title}-${m.url}`}
          href={m.url || '#'}
          target={m.url ? '_blank' : undefined}
          rel={m.url ? 'noreferrer' : undefined}
          className="dm-card flex items-center justify-between gap-3 p-4 transition hover:border-gold/40 hover:shadow-md"
        >
          <div className="min-w-0">
            <p className="font-medium text-stone-800 truncate">{m.title}</p>
            {m.url && <p className="mt-0.5 truncate text-xs text-stone-400">{m.url}</p>}
          </div>
          <span className="dm-badge shrink-0">{m.type || 'link'}</span>
        </a>
      ))}
    </div>
  );
}

export default function PartnerDashboard() {
  const { user, refreshUser, token } = useAuth();
  const [params, setParams] = useSearchParams();
  const { tab, pageInfo, alias } = resolvePartnerRoute(params);

  const [leadModal, setLeadModal] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ leaderboard: [], myRank: null });
  const [followUps, setFollowUps] = useState({ overdue: [], upcoming: [] });
  const [announcements, setAnnouncements] = useState([]);
  const [leads, setLeads] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [notifications, setNotifications] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const [leadForm, setLeadForm] = useState(emptyLeadForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadComments, setLeadComments] = useState([]);
  const [partnerEditForm, setPartnerEditForm] = useState(null);
  const [leadFilter, setLeadFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [payoutForm, setPayoutForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [phoneCheck, setPhoneCheck] = useState(null);
  const [leadTemplateFields, setLeadTemplateFields] = useState([]);
  const [partnerProducts, setPartnerProducts] = useState([]);
  const [partnerRates, setPartnerRates] = useState([]);
  const [partnerResources, setPartnerResources] = useState([]);

  useEffect(() => {
    api.auth.formTemplate('lead').then((r) => setLeadTemplateFields(r.fields || [])).catch(() => {});
  }, []);

  const sidebarLinks = getNavForRole('partner', user?.partnerType).map((l) => ({
    ...l,
    badge: l.tab === 'leads' ? followUps.overdue?.length : 0,
  }));

  useEffect(() => {
    if (alias?.openLeadModal) {
      setLeadModal(true);
      setParams({ tab: 'leads' }, { replace: true });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };
      const [notifData, annData] = await Promise.all([
        safe(() => api.partner.notifications(), { notifications: [], unread: 0 }),
        safe(() => api.partner.announcements(), { announcements: [] }),
      ]);
      setNotifications(notifData);
      setAnnouncements(annData.announcements || []);

      if (user?.status !== 'active' && tab !== 'profile') {
        setLoading(false);
        return;
      }

      const tasks = [];
      if (['overview', 'leads', 'follow-ups', 'money', 'reports', 'leaderboard', 'students', 'performance', 'revenue'].includes(tab)) {
        tasks.push(api.partner.dashboard().then(setDashboard));
        tasks.push(api.partner.followUps().then(setFollowUps));
      }
      if (['overview', 'leads', 'students', 'follow-ups'].includes(tab)) {
        tasks.push(api.partner.leads({ status: leadFilter, search }).then((d) => setLeads(d.leads)));
      }
      if (['overview', 'money', 'revenue'].includes(tab)) {
        tasks.push(api.partner.commissions().then((d) => setCommissions(d.commissions)));
      }
      if (tab === 'reports' || tab === 'overview' || tab === 'performance') {
        tasks.push(api.partner.reports().then(setReports));
      }
      if (tab === 'leaderboard' || tab === 'overview') {
        tasks.push(api.partner.leaderboard().then(setLeaderboard));
      }
      if (['training', 'marketing', 'product-info'].includes(tab)) {
        const category = tab === 'product-info' ? 'product' : tab;
        tasks.push(
          safe(() => api.partner.resources({ category }), { resources: [] })
            .then((d) => setPartnerResources(d.resources || []))
        );
      }
      if (tab === 'product-info') {
        tasks.push(
          safe(() => api.partner.products(), { products: [] })
            .then((d) => setPartnerProducts(d.products || []))
        );
      }
      if (tab === 'rates') {
        tasks.push(
          safe(() => api.partner.rates(), { rates: [] })
            .then((d) => setPartnerRates(d.rates || []))
        );
      }
      await Promise.all(tasks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, leadFilter, search, user?.status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, phone: user.phone, organization: user.organization, city: user.city, state: user.state, address: user.address || '' });
      setPayoutForm({ bankAccount: user.bankAccount || '', ifsc: user.ifsc || '', upiId: user.upiId || '', panNumber: user.panNumber || '' });
    }
  }, [user]);

  const openLead = async (lead) => {
    setSelectedLead(lead);
    setPartnerEditForm({
      studentName: lead.studentName || '',
      studentPhone: lead.studentPhone || '',
      studentEmail: lead.studentEmail || '',
      parentName: lead.parentName || '',
      parentPhone: lead.parentPhone || '',
      classGrade: lead.classGrade || '',
      schoolCollege: lead.schoolCollege || '',
      city: lead.city || '',
      notes: lead.notes || '',
      priority: lead.priority || 'medium',
      companyName: lead.companyName || '',
      contactPerson: lead.contactPerson || '',
      contactPhone: lead.contactPhone || '',
      contactEmail: lead.contactEmail || '',
    });
    try {
      const { comments } = await api.partner.leadComments(lead.id || lead._id);
      setLeadComments(comments);
    } catch { setLeadComments([]); }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      await api.partner.createLead(leadForm);
      setMessage('Lead submitted!');
      setLeadForm(emptyLeadForm);
      setPhoneCheck(null);
      setLeadModal(false);
      load();
    } catch (err) {
      setError(err.message);
      if (err.data?.duplicates || /duplicate/i.test(err.message || '')) {
        playDuplicateBuzz();
        if (err.data?.duplicates) setPhoneCheck(err.data.duplicates);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const checkPhone = async (phone) => {
    if (phone.length < 10) { setPhoneCheck(null); return; }
    try {
      const { duplicates } = await api.partner.checkDuplicate(phone);
      if (duplicates.length) {
        setPhoneCheck((prev) => {
          if (!prev?.length) playDuplicateBuzz();
          return duplicates;
        });
      } else {
        setPhoneCheck(null);
      }
    } catch { setPhoneCheck(null); }
  };

  const handleBulk = async (leadsData) => {
    setSubmitting(true);
    try {
      const res = await api.partner.bulkLeads(leadsData);
      setMessage(`Imported ${res.created} leads successfully`);
      load();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(user?.referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShare = () => {
    const text = encodeURIComponent(`Join Dream Mantra Partner Network! Use my referral code: ${user?.referralCode} — Register at ${window.location.origin}/signup`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const setTab = (t) => {
    if (t === 'overview') setParams({});
    else setParams({ tab: t });
  };

  if (user?.status === 'pending') {
    return (
      <DashboardLayout sidebarLinks={sidebarLinks} title="Partner Portal">
        <div className="mx-auto max-w-lg dm-card p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-gold" />
          <h2 className="mt-4 font-display text-xl font-bold text-stone-900">Account Pending Approval</h2>
          <p className="mt-2 text-stone-600">Your registration is under review. Our admin team will activate your account soon.</p>
          <p className="mt-4 text-sm text-stone-500">Referral Code: <span className="font-mono font-bold text-gold-dark">{user.referralCode}</span></p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      activeTab={tab}
      onTabChange={setTab}
      title={getDashboardTitle('partner', user?.partnerType)}
      badge={notifications.unread || followUps.overdue?.length || 0}
      notificationItems={[
        ...(notifications.unread > 0 ? [{
          id: 'partner-notifs',
          type: 'leads',
          title: `${notifications.unread} unread notification(s)`,
          desc: 'Messages and system alerts',
          tone: 'bg-amber-50 text-amber-700',
          tab: 'notifications',
        }] : []),
        ...(followUps.overdue?.length > 0 ? [{
          id: 'partner-overdue',
          type: 'followups',
          title: `${followUps.overdue.length} overdue follow-up(s)`,
          desc: 'Open follow-ups to catch up',
          tone: 'bg-red-50 text-red-700',
          tab: 'follow-ups',
        }] : []),
      ]}
      onNotificationClick={(item) => setTab(item.tab)}
      onNotificationMarkAll={() => setTab('notifications')}
    >
      <AnnouncementBanner announcements={announcements} />
      {user?.welcomePending && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 to-orange/5 p-5">
          <div>
            <p className="font-semibold text-stone-900">Your account is ready!</p>
            <p className="mt-1 text-sm text-stone-600">
              Partner ID: <code className="font-mono font-bold text-gold-dark">{user.loginId}</code> · Sign in anytime with your ID or email.
            </p>
          </div>
          <button
            type="button"
            className="dm-btn-gold text-sm"
            onClick={async () => { await api.partner.dismissWelcome(); await refreshUser(); }}
          >
            Got it
          </button>
        </div>
      )}
      {message && <div className="dm-alert-success mb-4"><CheckCircle className="h-4 w-4" /> {message}</div>}
      {error && <div className="dm-alert-error mb-4"><AlertCircle className="h-4 w-4" /> {error}</div>}

      {tab === 'overview' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="dm-card flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-stone-500">Welcome back</p>
              <h2 className="font-display text-xl font-bold text-stone-900">{user?.name}</h2>
              <p className="text-sm text-gold-dark">
                {partnerTypeLabel(user?.partnerType)} · <span className="capitalize">{user?.tier || 'bronze'} tier</span>
                {user?.loginId && <> · ID: <span className="font-mono font-bold">{user.loginId}</span></>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-mono text-gold-dark">{user?.referralCode}</code>
              <button type="button" onClick={copyReferral} className="dm-btn-ghost text-sm">{copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />} Copy</button>
              <button type="button" onClick={whatsappShare} className="dm-btn-primary text-sm">Share on WhatsApp</button>
            </div>
          </div>

          {!loading && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="Total Leads" value={dashboard?.stats?.totalLeads || 0} accent="orange" />
                <StatCard icon={CheckCircle} label="Converted" value={dashboard?.stats?.converted || 0} accent="green" />
                <StatCard icon={TrendingUp} label="Conversion Rate" value={`${reports?.conversionRate || 0}%`} accent="blue" />
                <StatCard icon={IndianRupee} label="Pending Commission" value={formatCurrency(dashboard?.stats?.pendingCommission)} accent="gold" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="dm-card p-5">
                  <h3 className="dm-section-title">Monthly Leads</h3>
                  <BarChart data={reports?.monthlyTrends || []} />
                </div>
                <div className="dm-card p-5">
                  <h3 className="dm-section-title">Lead Pipeline</h3>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {LEAD_STATUSES.slice(0, 8).map((s) => (
                      <div key={s.value} className="rounded-xl bg-stone-50 p-2 text-center">
                        <p className="text-lg font-bold text-stone-900">{dashboard?.stats?.statusCounts?.[s.value] || 0}</p>
                        <p className="text-[10px] text-stone-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {(followUps.overdue?.length > 0) && (
                <div className="dm-alert-warning"><AlertCircle className="h-4 w-4" /> {followUps.overdue.length} overdue follow-up(s) on your leads.</div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setLeadForm({ ...emptyLeadForm, leadType: 'student' }); setLeadModal(true); }} className="dm-card p-5 text-left hover:border-orange/40 hover:shadow-md transition">
                  <Plus className="mb-2 h-6 w-6 text-orange" />
                  <p className="font-semibold">Add Student Lead</p>
                  <p className="text-xs text-stone-500">Quick Students (B2C) — name & phone</p>
                </button>
                <button type="button" onClick={() => { setLeadForm({ ...emptyLeadForm, leadType: 'business' }); setLeadModal(true); }} className="dm-card p-5 text-left hover:border-indigo-300 hover:shadow-md transition">
                  <Plus className="mb-2 h-6 w-6 text-indigo-600" />
                  <p className="font-semibold">Add Business Lead</p>
                  <p className="text-xs text-stone-500">School / college / Partners (B2B)</p>
                </button>
              </div>

              <div className="dm-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-stone-100 p-4">
                  <h3 className="dm-section-title">Recent Leads</h3>
                  <ExportButton href={api.partner.exportLeads()} token={token} />
                </div>
                <div className="overflow-x-auto">
                  <table className="dm-table w-full">
                    <thead><tr><th>Dreamz ID</th><th>Student</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {(dashboard?.recentLeads || []).map((lead) => (
                        <tr key={lead.id || lead._id} className="cursor-pointer" onClick={() => openLead(lead)}>
                          <td className="font-mono text-gold-dark">{lead.leadId}</td>
                          <td>{lead.studentName}</td>
                          <td><StatusBadge status={lead.status} /></td>
                          <td className="text-stone-400">{formatDate(lead.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                {getPartnerGroups(AGENCY_TYPES.includes(user?.partnerType)).map((group) => (
                  <SectionBlock key={group.id} title={group.label}>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {group.tabs.map((item) => (
                        <button key={item.tab} type="button" onClick={() => setTab(item.tab)} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left text-sm font-medium text-stone-800 transition hover:border-gold/40 hover:bg-white">
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </SectionBlock>
                ))}
              </div>
            </>
          )}
        </DashboardSection>
      )}

      {tab === 'leads' && (
        <DashboardSection
          title={pageInfo.title}
          description={pageInfo.desc}
          actions={<button type="button" onClick={() => { setLeadForm(emptyLeadForm); setLeadModal(true); }} className="dm-btn-primary"><Plus className="h-4 w-4" /> Add Lead</button>}
        >
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input className="dm-input pl-10" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
            </div>
            <select className="dm-input w-auto" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)}>
              <option value="all">All Status</option>
              {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button type="button" onClick={load} className="dm-btn-ghost">Search</button>
            <ExportButton href={api.partner.exportLeads({ status: leadFilter, search })} token={token} />
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr><th>Dreamz ID</th><th>Type</th><th>Name / Contact</th><th>Phone</th><th>Class / Org</th><th>Status</th><th>Priority</th><th>Updated</th></tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id || lead._id} className="cursor-pointer" onClick={() => openLead(lead)}>
                    <td className="font-mono text-gold-dark">{lead.leadId}</td>
                    <td><span className={`dm-badge text-xs ${lead.leadType === 'business' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{lead.leadType === 'business' ? 'Partners (B2B)' : 'Students (B2C)'}</span></td>
                    <td className="font-medium">{leadDisplayName(lead)}</td>
                    <td>{leadDisplayPhone(lead)}</td>
                    <td>{lead.leadType === 'business' ? (lead.businessType || '—') : (lead.classGrade || '—')}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td><span className={`dm-badge capitalize ${lead.priority === 'high' ? 'bg-red-100 text-red-700' : lead.priority === 'low' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>{lead.priority}</span></td>
                    <td className="text-stone-400">{formatDate(lead.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leads.length && <p className="p-8 text-center text-stone-400">No leads found</p>}
          </div>
        </DashboardSection>
      )}

      {tab === 'bulk' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <BulkLeadImport onImport={handleBulk} loading={submitting} />
        </DashboardSection>
      )}

      {tab === 'follow-ups' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <FollowUpList overdue={followUps.overdue} upcoming={followUps.upcoming} onSelect={openLead} />
        </DashboardSection>
      )}

      {tab === 'money' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Earned" value={formatCurrency(user?.totalEarnings)} accent="green" />
            <StatCard label="Pending" value={formatCurrency(commissions.filter((c) => c.status === 'pending' || c.status === 'approved').reduce((s, c) => s + c.amount, 0))} accent="gold" />
            <StatCard label="Paid" value={formatCurrency(commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0))} accent="blue" />
          </div>
          <div className="dm-card overflow-x-auto">
            <div className="border-b border-stone-100 p-4"><h3 className="dm-section-title">Commission History</h3></div>
            <table className="dm-table w-full">
              <thead><tr><th>Lead</th><th>Name</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id || c._id}>
                    <td className="font-mono text-gold-dark">{c.lead?.leadId}</td>
                    <td>{leadDisplayName(c.lead || {})}</td>
                    <td className="font-semibold text-emerald-600">{formatCurrency(c.amount)}</td>
                    <td><span className="dm-badge bg-stone-100 capitalize text-stone-700">{c.status}</span></td>
                    <td className="text-stone-400">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form onSubmit={async (e) => { e.preventDefault(); await api.partner.payoutDetails(payoutForm); setMessage('Payout details saved'); refreshUser(); }} className="mx-auto max-w-xl dm-card space-y-4 p-6">
            <h2 className="font-display text-lg font-bold text-stone-900">Payout Details</h2>
            <p className="text-sm text-stone-500">Bank / UPI for receiving commissions</p>
            {['bankAccount', 'ifsc', 'upiId', 'panNumber'].map((f) => (
              <div key={f}><label className="dm-label uppercase">{f}</label><input className="dm-input" value={payoutForm[f] || ''} onChange={(e) => setPayoutForm({ ...payoutForm, [f]: e.target.value })} /></div>
            ))}
            <button type="submit" className="dm-btn-primary">Save Payout Details</button>
          </form>
        </DashboardSection>
      )}

      {tab === 'reports' && reports && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Conversion Rate" value={`${reports.conversionRate}%`} accent="green" />
            <StatCard label="Your Tier" value={user?.tier || 'bronze'} accent="gold" />
            <StatCard label="Leaderboard Rank" value={leaderboard.myRank ? `#${leaderboard.myRank}` : '—'} accent="orange" />
          </div>
          <div className="dm-card p-5"><h3 className="dm-section-title mb-4">6-Month Lead Trend</h3><BarChart data={reports.monthlyTrends} /></div>
          {reports.topInterests?.length > 0 && (
            <div className="dm-card p-5">
              <h3 className="dm-section-title mb-4">Top Student Interests</h3>
              <div className="space-y-2">
                {reports.topInterests.map((i) => (
                  <div key={i.name} className="flex justify-between rounded-lg bg-stone-50 px-4 py-2">
                    <span className="text-stone-700">{i.name}</span>
                    <span className="font-bold text-gold-dark">{i.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="dm-card p-5">
            <h3 className="dm-section-title mb-2">Partner Tier Benefits</h3>
            <div className="grid gap-2 sm:grid-cols-4">
              {PARTNER_TIERS.map((t) => (
                <div key={t.value} className={`rounded-xl border p-3 text-center ${user?.tier === t.value ? 'border-gold bg-amber-50' : 'border-stone-200'}`}>
                  <p className="font-bold capitalize text-stone-900">{t.label}</p>
                  <p className="text-xs text-stone-500">{t.minLeads}+ leads</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="dm-card p-6">
          <h2 className="mb-4 dm-section-title">Partner Leaderboard {leaderboard.myRank && <span className="text-sm font-normal text-stone-500">— Your rank: #{leaderboard.myRank}</span>}</h2>
          <Leaderboard items={leaderboard.leaderboard} highlightId={user?.id} />
        </div>
      )}

      {tab === 'payout' && (
        <form onSubmit={async (e) => { e.preventDefault(); await api.partner.payoutDetails(payoutForm); setMessage('Payout details saved'); refreshUser(); }} className="mx-auto max-w-xl dm-card space-y-4 p-6">
          <h2 className="font-display text-xl font-bold text-stone-900">Payout Details</h2>
          <p className="text-sm text-stone-500">Add your bank/UPI details for commission payouts</p>
          {['bankAccount', 'ifsc', 'upiId', 'panNumber'].map((f) => (
            <div key={f}><label className="dm-label uppercase">{f}</label><input className="dm-input" value={payoutForm[f]} onChange={(e) => setPayoutForm({ ...payoutForm, [f]: e.target.value })} /></div>
          ))}
          <button type="submit" className="dm-btn-primary">Save Payout Details</button>
        </form>
      )}

      {tab === 'profile' && (
        <form onSubmit={async (e) => { e.preventDefault(); await api.auth.updateProfile(profileForm); setMessage('Profile updated'); refreshUser(); }} className="mx-auto max-w-xl dm-card space-y-4 p-6">
          <h2 className="font-display text-xl font-bold text-stone-900">My Profile</h2>
          {['name', 'phone', 'organization', 'city', 'state', 'address'].map((field) => (
            <div key={field}>
              <label className="dm-label capitalize">{field}</label>
              {field === 'address' ? <textarea className="dm-input" value={profileForm[field]} onChange={(e) => setProfileForm({ ...profileForm, [field]: e.target.value })} /> : <input className="dm-input" value={profileForm[field]} onChange={(e) => setProfileForm({ ...profileForm, [field]: e.target.value })} />}
            </div>
          ))}
          <button type="submit" className="dm-btn-primary">Save Profile</button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (passwordForm.newPassword !== passwordForm.confirm) { setError('Passwords do not match'); return; }
          await api.auth.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
          setMessage('Password changed'); setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
        }} className="mx-auto max-w-md dm-card space-y-4 p-6">
          <h2 className="font-display text-xl font-bold text-stone-900">Change Password</h2>
          <div><label className="dm-label">Current Password</label><input type="password" className="dm-input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required /></div>
          <div><label className="dm-label">New Password</label><input type="password" className="dm-input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} minLength={6} required /></div>
          <div><label className="dm-label">Confirm Password</label><input type="password" className="dm-input" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required /></div>
          <button type="submit" className="dm-btn-primary">Update Password</button>
        </form>
      )}

      {(tab === 'agency-hub' || tab === 'franchise') && ['agency', 'franchise'].includes(user?.partnerType) && (
        <AgencyHub onRefresh={load} />
      )}

      {tab === 'messages' && (
        <ChatMessenger isAdmin={false} />
      )}

      {tab === 'notifications' && (
        <div className="space-y-3">
          <button type="button" onClick={() => api.partner.markAllRead().then(load)} className="dm-btn-ghost text-sm mb-2">Mark all read</button>
          {notifications.notifications.map((n) => (
            <div key={n.id || n._id} className={`dm-card p-4 ${n.read ? 'opacity-70' : 'ring-2 ring-orange/20'}`}>
              <p className="font-semibold text-stone-900">{n.title}</p>
              <p className="mt-1 text-sm text-stone-600">{n.message}</p>
              <p className="mt-2 text-xs text-stone-400">{formatDate(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'students' && (
        <div className="dm-card overflow-x-auto">
          <h2 className="dm-section-title p-4 pb-0">Student Status</h2>
          <table className="dm-table w-full mt-4">
            <thead><tr><th>Dreamz ID</th><th>Student</th><th>Class</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="cursor-pointer hover:bg-stone-50" onClick={() => openLead(l)}>
                  <td className="font-mono text-xs">{l.leadId}</td>
                  <td>{l.studentName}</td>
                  <td>{l.classGrade || '—'}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{formatDate(l.updatedAt || l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'wallet' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Earnings" value={formatCurrency(dashboard?.stats?.totalEarnings)} />
          <StatCard label="Pending" value={formatCurrency(commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount, 0))} />
          <StatCard label="Paid" value={formatCurrency(commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0))} />
        </div>
      )}

      {tab === 'marketing' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <ResourceLinkCards items={partnerResources} emptyLabel="No marketing resources yet" />
        </DashboardSection>
      )}

      {tab === 'training' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <ResourceLinkCards items={partnerResources} emptyLabel="No training resources yet" />
        </DashboardSection>
      )}

      {tab === 'product-info' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              {partnerProducts.map((p) => (
                <div key={p.id} className="dm-card p-4">
                  <p className="font-semibold text-stone-900">{p.label}</p>
                  <p className="mt-1 text-sm text-stone-500">Base price: {formatCurrency(p.price)}</p>
                  {p.commission && (
                    <p className="mt-1 text-xs text-gold-dark">
                      Commission: {p.commission.type === 'percentage' ? `${p.commission.value}%` : formatCurrency(p.commission.value)}
                    </p>
                  )}
                </div>
              ))}
              {!partnerProducts.length && (
                <p className="dm-card col-span-full p-8 text-center text-sm text-stone-400">No products allocated to you yet</p>
              )}
            </div>
            <SectionBlock title="Product resources">
              <ResourceLinkCards items={partnerResources} emptyLabel="No product resources yet" />
            </SectionBlock>
          </div>
        </DashboardSection>
      )}

      {tab === 'rates' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>List price</th>
                  <th>Sale price</th>
                </tr>
              </thead>
              <tbody>
                {partnerRates.map((r) => (
                  <tr key={r.rateId || r.productId}>
                    <td className="font-medium">{r.label}</td>
                    <td>{formatCurrency(r.listPrice)}</td>
                    <td className="font-semibold text-emerald-700">{formatCurrency(r.salePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!partnerRates.length && <p className="p-8 text-center text-sm text-stone-400">No rates available for your products</p>}
          </div>
        </DashboardSection>
      )}

      {tab === 'support' && (
        <div className="dm-card p-8 text-center">
          <h2 className="dm-section-title mb-2">Partner Support</h2>
          <p className="text-stone-600 mb-4">WhatsApp: 9680102276 · Email: info@dreammantra.in</p>
          <button type="button" className="dm-btn-primary" onClick={() => setParams({ tab: 'messages' })}>Message Admin</button>
        </div>
      )}

      {tab === 'team' && AGENCY_TYPES.includes(user?.partnerType) && (
        <div className="dm-card p-6">
          <h2 className="dm-section-title mb-2">Team Members</h2>
          <p className="text-stone-600">Agency team management — invite sub-partners via Super Admin. Your referral code: <strong>{user?.referralCode}</strong></p>
        </div>
      )}

      {tab === 'performance' && AGENCY_TYPES.includes(user?.partnerType) && reports && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Conversion Rate" value={`${reports.conversionRate || 0}%`} />
          <StatCard label="This Month Leads" value={reports.thisMonthLeads || 0} />
        </div>
      )}

      {tab === 'revenue' && AGENCY_TYPES.includes(user?.partnerType) && (
        <div className="dm-card p-6">
          <h2 className="dm-section-title">Agency Revenue</h2>
          <p className="text-3xl font-bold text-gold-dark mt-2">{formatCurrency(dashboard?.stats?.totalEarnings)}</p>
          <p className="text-sm text-stone-500 mt-1">Total commission earned</p>
        </div>
      )}

      <Modal open={leadModal} onClose={() => setLeadModal(false)} title="Add Lead" wide>
        {phoneCheck && (
          <div className="mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <p className="font-semibold text-amber-900">Possible duplicate phone</p>
            <p className="mt-1 text-amber-800">
              {phoneCheck.map((d) => `${leadDisplayName(d) || d.studentName} (${d.leadId})`).join(', ')}
            </p>
          </div>
        )}
        <LeadForm
          quick
          form={leadForm}
          templateFields={leadTemplateFields}
          onChange={(f) => {
            setLeadForm(f);
            const phone = f.leadType === 'business' ? f.contactPhone : f.studentPhone;
            if (phone) checkPhone(phone);
          }}
          onSubmit={handleAddLead}
          loading={submitting}
          submitLabel="Submit Lead"
        />
      </Modal>

      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={`Dreamz ID ${selectedLead?.leadId}`} wide>
        {selectedLead && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedLead.status} />
              <p className="text-xs text-stone-500">Partner ID: {user?.loginId}</p>
            </div>
            {selectedLead.adminNotes && <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold text-gold-dark">Admin Update</p><p className="mt-1 text-sm text-stone-700">{selectedLead.adminNotes}</p></div>}

            {!['converted', 'lost', 'completed'].includes(selectedLead.status) && partnerEditForm && (
              <form
                className="space-y-3 rounded-xl border border-stone-200 p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.partner.updateLead(selectedLead.id || selectedLead._id, partnerEditForm);
                    setMessage('Lead details updated');
                    setSelectedLead(null);
                    load();
                  } catch (err) { setError(err.message); }
                }}
              >
                <p className="font-semibold text-stone-800">Update Lead Details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries({
                    studentName: 'Name', studentPhone: 'Phone', studentEmail: 'Email',
                    parentName: 'Parent', classGrade: 'Class', schoolCollege: 'School / College',
                    city: 'City', notes: 'Notes',
                  }).map(([key, label]) => (
                    <div key={key}>
                      <label className="dm-label">{label}</label>
                      <input className="dm-input" value={partnerEditForm[key] || ''} onChange={(e) => setPartnerEditForm({ ...partnerEditForm, [key]: e.target.value })} />
                    </div>
                  ))}
                  <div>
                    <label className="dm-label">Priority</label>
                    <select className="dm-input" value={partnerEditForm.priority} onChange={(e) => setPartnerEditForm({ ...partnerEditForm, priority: e.target.value })}>
                      {['low', 'medium', 'high'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="dm-btn-primary">Save Updates</button>
              </form>
            )}

            {selectedLead.statusHistory?.length > 0 && (
              <div>
                <p className="mb-3 font-semibold text-stone-900">Status Timeline</p>
                <div className="space-y-3 border-l-2 border-gold/30 pl-4">
                  {[...selectedLead.statusHistory].reverse().map((h, i) => (
                    <div key={i}><StatusBadge status={h.status} /><p className="mt-1 text-xs text-stone-500">{h.note}</p><p className="text-xs text-stone-400">{formatDate(h.createdAt)}</p></div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold text-stone-900"><MessageCircle className="h-4 w-4" /> Comments</p>
              <LeadComments comments={leadComments} onAdd={(msg) => api.partner.addComment(selectedLead.id || selectedLead._id, msg).then(() => openLead(selectedLead))} />
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
