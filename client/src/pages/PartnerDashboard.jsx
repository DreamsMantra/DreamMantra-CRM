import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import FranchiseHub from '../components/FranchiseHub';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { LEAD_STATUSES, formatDate, formatCurrency, partnerTypeLabel, PARTNER_TIERS } from '../utils/constants';

const baseLinks = [
  { to: '/partner', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/partner?tab=leads', label: 'My Leads', icon: Users },
  { to: '/partner?tab=add-lead', label: 'Add Lead', icon: Plus },
  { to: '/partner?tab=bulk', label: 'Bulk Import', icon: Upload },
  { to: '/partner?tab=follow-ups', label: 'Follow-ups', icon: Calendar },
  { to: '/partner?tab=commissions', label: 'Commissions', icon: IndianRupee },
  { to: '/partner?tab=reports', label: 'Reports', icon: BarChart3 },
  { to: '/partner?tab=leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/partner?tab=payout', label: 'Payout Details', icon: CreditCard },
  { to: '/partner?tab=profile', label: 'Profile', icon: UserCircle },
  { to: '/partner?tab=password', label: 'Security', icon: Lock },
  { to: '/partner?tab=notifications', label: 'Notifications', icon: Bell },
];

export default function PartnerDashboard() {
  const { user, refreshUser, token } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

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
  const [leadFilter, setLeadFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [payoutForm, setPayoutForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [phoneCheck, setPhoneCheck] = useState(null);

  const sidebarLinks = [
    ...baseLinks,
    ...(user?.partnerType === 'franchise' ? [{ to: '/partner?tab=franchise', label: 'Franchise Hub', icon: Store }] : []),
  ].map((l) => ({
    ...l,
    badge: l.label === 'Notifications' ? notifications.unread : l.label === 'Follow-ups' ? followUps.overdue?.length : 0,
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [notifData, annData] = await Promise.all([
        api.partner.notifications(),
        api.partner.announcements(),
      ]);
      setNotifications(notifData);
      setAnnouncements(annData.announcements || []);

      if (user?.status !== 'active' && tab !== 'profile') {
        setLoading(false);
        return;
      }

      const tasks = [
        api.partner.dashboard().then(setDashboard),
        api.partner.leads({ status: leadFilter, search }).then((d) => setLeads(d.leads)),
        api.partner.commissions().then((d) => setCommissions(d.commissions)),
        api.partner.followUps().then(setFollowUps),
      ];
      if (tab === 'reports' || tab === 'overview') tasks.push(api.partner.reports().then(setReports));
      if (tab === 'leaderboard' || tab === 'overview') tasks.push(api.partner.leaderboard().then(setLeaderboard));
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
      setMessage('Lead submitted successfully!');
      setLeadForm(emptyLeadForm);
      setPhoneCheck(null);
      setParams({ tab: 'leads' });
      load();
    } catch (err) {
      setError(err.message);
      if (err.data?.duplicates) setPhoneCheck(err.data.duplicates);
    } finally {
      setSubmitting(false);
    }
  };

  const checkPhone = async (phone) => {
    if (phone.length < 10) { setPhoneCheck(null); return; }
    try {
      const { duplicates } = await api.partner.checkDuplicate(phone);
      setPhoneCheck(duplicates.length ? duplicates : null);
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
    <DashboardLayout sidebarLinks={sidebarLinks} title="Partner Portal" badge={notifications.unread}>
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
        <div className="space-y-6">
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
                <div className="dm-alert-warning"><AlertCircle className="h-4 w-4" /> You have {followUps.overdue.length} overdue follow-up(s). <button type="button" className="font-semibold underline" onClick={() => setParams({ tab: 'follow-ups' })}>View</button></div>
              )}

              <div className="dm-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-stone-100 p-4">
                  <h3 className="dm-section-title">Recent Leads</h3>
                  <ExportButton href={api.partner.exportLeads()} token={token} />
                </div>
                <div className="overflow-x-auto">
                  <table className="dm-table w-full">
                    <thead><tr><th>Lead ID</th><th>Student</th><th>Status</th><th>Date</th></tr></thead>
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
            </>
          )}
        </div>
      )}

      {tab === 'leads' && (
        <div className="space-y-4">
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
              <thead><tr><th>Lead ID</th><th>Student</th><th>Phone</th><th>Class</th><th>Status</th><th>Priority</th><th>Updated</th></tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id || lead._id} className="cursor-pointer" onClick={() => openLead(lead)}>
                    <td className="font-mono text-gold-dark">{lead.leadId}</td>
                    <td className="font-medium">{lead.studentName}</td>
                    <td>{lead.studentPhone}</td>
                    <td>{lead.classGrade || '—'}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td><span className={`dm-badge capitalize ${lead.priority === 'high' ? 'bg-red-100 text-red-700' : lead.priority === 'low' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>{lead.priority}</span></td>
                    <td className="text-stone-400">{formatDate(lead.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leads.length && <p className="p-8 text-center text-stone-400">No leads found</p>}
          </div>
        </div>
      )}

      {tab === 'add-lead' && (
        <div className="mx-auto max-w-3xl dm-card p-6">
          <h2 className="mb-2 font-display text-xl font-bold text-stone-900">Submit New Student Lead</h2>
          <p className="mb-6 text-sm text-stone-500">Fill in student details. Duplicate phone numbers are automatically detected.</p>
          {phoneCheck && (
            <div className="dm-alert-warning mb-4">
              Possible duplicate: {phoneCheck.map((d) => `${d.studentName} (${d.leadId})`).join(', ')}
            </div>
          )}
          <LeadForm
            form={leadForm}
            onChange={(f) => { setLeadForm(f); if (f.studentPhone) checkPhone(f.studentPhone); }}
            onSubmit={handleAddLead}
            loading={submitting}
          />
        </div>
      )}

      {tab === 'bulk' && (
        <div className="mx-auto max-w-2xl dm-card p-6">
          <h2 className="mb-4 font-display text-xl font-bold text-stone-900">Bulk Lead Import</h2>
          <BulkLeadImport onImport={handleBulk} loading={submitting} />
        </div>
      )}

      {tab === 'follow-ups' && <div className="dm-card p-6"><h2 className="mb-4 dm-section-title">Follow-up Reminders</h2><FollowUpList overdue={followUps.overdue} upcoming={followUps.upcoming} onSelect={openLead} /></div>}

      {tab === 'commissions' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Earned" value={formatCurrency(user?.totalEarnings)} accent="green" />
            <StatCard label="Pending" value={formatCurrency(commissions.filter((c) => c.status === 'pending' || c.status === 'approved').reduce((s, c) => s + c.amount, 0))} accent="gold" />
            <StatCard label="Paid" value={formatCurrency(commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0))} accent="blue" />
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr><th>Lead</th><th>Student</th><th>Amount</th><th>Rate</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id || c._id}>
                    <td className="font-mono text-gold-dark">{c.lead?.leadId}</td>
                    <td>{c.lead?.studentName}</td>
                    <td className="font-semibold text-emerald-600">{formatCurrency(c.amount)}</td>
                    <td>{c.rate}%</td>
                    <td><span className="dm-badge bg-stone-100 capitalize text-stone-700">{c.status}</span></td>
                    <td className="text-stone-400">{formatDate(c.createdAt)}</td>
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

      {tab === 'franchise' && user?.partnerType === 'franchise' && (
        <FranchiseHub onRefresh={load} />
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

      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={`Lead ${selectedLead?.leadId}`} wide>
        {selectedLead && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Student', selectedLead.studentName], ['Phone', selectedLead.studentPhone],
                ['Email', selectedLead.studentEmail || '—'], ['Class', selectedLead.classGrade || '—'],
                ['City', selectedLead.city || '—'], ['Budget', selectedLead.budget || '—'],
              ].map(([k, v]) => (
                <div key={k}><p className="text-xs text-stone-400">{k}</p><p className="font-medium text-stone-800">{v}</p></div>
              ))}
              <div><p className="text-xs text-stone-400">Status</p><StatusBadge status={selectedLead.status} /></div>
            </div>
            {selectedLead.interestedIn?.length > 0 && (
              <div className="flex flex-wrap gap-2">{selectedLead.interestedIn.map((i) => <span key={i} className="dm-badge bg-orange/10 text-orange">{i}</span>)}</div>
            )}
            {selectedLead.adminNotes && <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold text-gold-dark">Admin Update</p><p className="mt-1 text-sm text-stone-700">{selectedLead.adminNotes}</p></div>}
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
