import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import DashboardSection from '../components/layout/DashboardSection';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import FollowUpList from '../components/FollowUpList';
import StudentsPanel from '../components/admin/StudentsPanel';
import Modal from '../components/Modal';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, getDashboardTitle } from '../config/roleNavigation';
import { resolveStaffRoute, isStaffPlaceholderTab } from '../config/staffTabs';
import { formatDate, LEAD_STATUSES } from '../utils/constants';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { tab, pageInfo } = resolveStaffRoute(params);
  const [dashboard, setDashboard] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [calls, setCalls] = useState([]);
  const [followUps, setFollowUps] = useState({ overdue: [], upcoming: [], today: [] });
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', notes: '' });
  const [newCall, setNewCall] = useState({ leadId: '', notes: '', duration: '' });
  const [newSession, setNewSession] = useState({ studentId: '', notes: '', scheduledAt: '' });
  const [msg, setMsg] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadForm, setLeadForm] = useState({});

  const role = user?.role;
  const sidebarLinks = getNavForRole(role).map((l) => ({
    ...l,
    badge: l.tab === 'follow-ups' ? (followUps.overdue?.length || 0) : 0,
  }));

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = useCallback(async () => {
    const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };
    const tasks = [];

    if (['overview', 'leads', 'pending', 'follow-ups', 'calls'].includes(tab)) {
      tasks.push(safe(() => api.staff.dashboard(), null).then((d) => { if (d) setDashboard(d); }));
      tasks.push(safe(() => api.staff.leads(), { leads: [] }).then((r) => setLeads(r.leads || [])));
      tasks.push(safe(() => api.staff.followUps(), { overdue: [], upcoming: [], today: [] }).then(setFollowUps));
    }
    if (tab === 'tasks' || tab === 'overview') {
      tasks.push(safe(() => api.staff.tasks(), { tasks: [] }).then((r) => setTasks(r.tasks || [])));
    }
    if (['brain', 'skill', 'generate', 'review', 'upload', 'delivery', 'history', 'pending', 'overview'].includes(tab)) {
      tasks.push(safe(() => api.staff.reports(), { reports: [] }).then((r) => setReports(r.reports || [])));
    }
    if (['sessions', 'notes', 'history'].includes(tab) && role === 'counsellor') {
      tasks.push(safe(() => api.staff.sessions(), { sessions: [] }).then((s) => setSessions(s.sessions || [])));
    }
    if (tab === 'calls' && role === 'sales_executive') {
      tasks.push(safe(() => api.staff.calls(), { calls: [] }).then((c) => setCalls(c.calls || [])));
    }
    await Promise.all(tasks);
  }, [tab, role]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const title = getDashboardTitle(role);
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t });

  const openLead = async (l) => {
    if (l?.kind === 'activity') {
      const go = window.confirm(
        `Partner activity reminder\n\n${l.partnerName || 'Partner'}\n${l.comment || ''}\n\nDue ${l.followUpDate || ''}\n\nMark this follow-up done?`
      );
      if (go) {
        try {
          await api.staff.updatePartnerActivity(l.id, { completed: true });
          flash('Follow-up marked done');
          load();
        } catch (err) {
          flash(err?.message || 'Could not update follow-up');
        }
      }
      return;
    }
    setSelectedLead(l);
    setLeadForm({
      status: l.status || 'new',
      priority: l.priority || 'medium',
      followUpDate: l.followUpDate?.slice?.(0, 10) || '',
      notes: l.notes || '',
      adminNotes: l.adminNotes || '',
      studentName: l.studentName || '',
      studentPhone: l.studentPhone || '',
      studentEmail: l.studentEmail || '',
      parentName: l.parentName || '',
      classGrade: l.classGrade || '',
      schoolCollege: l.schoolCollege || '',
    });
  };

  const saveLead = async (e) => {
    e.preventDefault();
    await api.staff.updateLead(selectedLead.id, leadForm);
    flash('Lead updated');
    setSelectedLead(null);
    load();
  };

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      activeTab={tab}
      onTabChange={setTab}
      title={`Dream Mantra · ${title}`}
      badge={followUps.overdue?.length || 0}
      notificationItems={followUps.overdue?.length > 0 ? [{
        id: 'staff-overdue',
        type: 'followups',
        title: `${followUps.overdue.length} overdue follow-up(s)`,
        desc: 'Open follow-ups to catch up',
        tone: 'bg-red-50 text-red-700',
        tab: 'follow-ups',
      }] : []}
      onNotificationClick={(item) => setTab(item.tab)}
      onNotificationMarkAll={() => setTab('follow-ups')}
    >
      {msg && <p className="mb-4 text-sm text-emerald-600">{msg}</p>}

      {tab === 'overview' && dashboard && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Leads" value={dashboard.stats.activeLeads} />
            <StatCard label="Students" value={dashboard.stats.students} />
            <StatCard label="Pending Tasks" value={dashboard.stats.pendingTasks} />
            <StatCard label="Follow-ups Today" value={dashboard.stats.followUpsToday} />
          </div>
          <div className="dm-card p-6">
            <h2 className="dm-section-title mb-4">Recent Leads</h2>
            <div className="space-y-2">
              {dashboard.recentLeads?.map((l) => (
                <button type="button" key={l.id} className="flex w-full justify-between items-center border-b border-stone-100 py-2 text-left hover:bg-stone-50" onClick={() => openLead(l)}>
                  <div><p className="font-medium">{l.studentName}</p><p className="text-xs text-stone-500">{l.leadId}</p></div>
                  <StatusBadge status={l.status} />
                </button>
              ))}
              {!dashboard.recentLeads?.length && <p className="text-stone-500">No leads assigned yet.</p>}
            </div>
          </div>
        </DashboardSection>
      )}

      {(tab === 'leads' || tab === 'pending') && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr><th>Lead ID</th><th>Student</th><th>Mobile</th><th>Product</th><th>Status</th><th>Follow-up</th><th>Update</th></tr></thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td className="font-mono text-xs">{l.leadId}</td>
                    <td>{l.studentName}</td>
                    <td>{l.studentPhone}</td>
                    <td className="text-xs">{(l.interestedIn || []).join(', ')}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>{formatDate(l.followUpDate)}</td>
                    <td><button type="button" className="text-xs font-semibold text-gold-dark" onClick={() => openLead(l)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leads.length && <p className="p-8 text-center text-stone-500">No leads assigned.</p>}
          </div>
        </DashboardSection>
      )}

      {tab === 'students' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <StudentsPanel embedded apiMode="staff" />
        </DashboardSection>
      )}

      {tab === 'follow-ups' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <FollowUpList overdue={followUps.overdue} upcoming={followUps.upcoming} onSelect={openLead} />
        </DashboardSection>
      )}

      {tab === 'tasks' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="space-y-4">
            <div className="dm-card p-4">
              <h3 className="font-semibold mb-3">Add Task</h3>
              <form className="grid gap-2 md:grid-cols-4" onSubmit={async (e) => {
                e.preventDefault();
                await api.staff.createTask(newTask);
                setNewTask({ title: '', dueDate: '', notes: '' });
                flash('Task created');
                load();
              }}>
                <input className="dm-input" placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required />
                <input type="date" className="dm-input" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                <input className="dm-input" placeholder="Notes" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} />
                <button type="submit" className="dm-btn-primary">Add</button>
              </form>
            </div>
            <div className="dm-card p-4 space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex justify-between border-b py-2">
                  <div><p className="font-medium">{t.title}</p><p className="text-xs text-stone-500">{t.notes}</p></div>
                  <span className="dm-badge">{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      )}

      {tab === 'calls' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="space-y-4">
            <form className="dm-card p-4 grid gap-2 md:grid-cols-4" onSubmit={async (e) => {
              e.preventDefault();
              await api.staff.createCall(newCall);
              setNewCall({ leadId: '', notes: '', duration: '' });
              flash('Call logged');
              load();
            }}>
              <select className="dm-input" value={newCall.leadId} onChange={(e) => setNewCall({ ...newCall, leadId: e.target.value })} required>
                <option value="">Select lead</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.studentName}</option>)}
              </select>
              <input className="dm-input" placeholder="Duration (min)" value={newCall.duration} onChange={(e) => setNewCall({ ...newCall, duration: e.target.value })} />
              <input className="dm-input" placeholder="Notes" value={newCall.notes} onChange={(e) => setNewCall({ ...newCall, notes: e.target.value })} />
              <button type="submit" className="dm-btn-primary">Log Call</button>
            </form>
            <div className="dm-card p-4">{calls.map((c) => <div key={c.id} className="py-2 border-b"><p>{c.notes}</p><p className="text-xs text-stone-500">{formatDate(c.createdAt)}</p></div>)}</div>
          </div>
        </DashboardSection>
      )}

      {['sessions', 'notes', 'history'].includes(tab) && role === 'counsellor' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="space-y-4">
            <form className="dm-card p-4 grid gap-2 md:grid-cols-3" onSubmit={async (e) => {
              e.preventDefault();
              await api.staff.createSession(newSession);
              setNewSession({ studentId: '', notes: '', scheduledAt: '' });
              flash('Session saved');
              load();
            }}>
              <input className="dm-input" placeholder="Student / Lead ID" value={newSession.studentId} onChange={(e) => setNewSession({ ...newSession, studentId: e.target.value })} required />
              <input type="datetime-local" className="dm-input" value={newSession.scheduledAt} onChange={(e) => setNewSession({ ...newSession, scheduledAt: e.target.value })} />
              <input className="dm-input" placeholder="Counselling notes" value={newSession.notes} onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })} />
              <button type="submit" className="dm-btn-primary md:col-span-3">Save Session</button>
            </form>
            <div className="dm-card p-4">
              {sessions.map((s) => (
                <div key={s.id} className="py-3 border-b">
                  <p className="font-medium">{s.notes || 'Session'}</p>
                  <p className="text-xs text-stone-500">{formatDate(s.scheduledAt || s.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      )}

      {['brain', 'skill', 'generate', 'review', 'upload', 'delivery', 'history'].includes(tab) && role === 'report_management' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <div className="space-y-4">
            <div className="dm-card p-4">
              <h3 className="font-semibold mb-2">Report: {tab.replace(/-/g, ' ')}</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                await api.staff.createReport({ type: tab, status: tab === 'delivery' ? 'delivered' : 'pending', title: `Report ${tab}` });
                flash('Report updated');
                load();
              }}>
                <button type="submit" className="dm-btn-primary">Create / Update Report Entry</button>
              </form>
            </div>
            <div className="dm-card p-4">
              {reports.map((r) => (
                <div key={r.id} className="flex justify-between py-2 border-b">
                  <span>{r.title || r.type}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      )}

      {isStaffPlaceholderTab(tab) && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <p className="text-stone-600">Use lead comments and follow-ups for {tab.replace(/-/g, ' ')} notes. Full integration coming in the next update.</p>
          <p className="mt-4 text-sm">Assigned leads: <strong>{leads.length}</strong></p>
        </DashboardSection>
      )}

      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title={`Lead ID ${selectedLead?.leadId || ''}`} wide>
        {selectedLead && (
          <form onSubmit={saveLead} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="dm-label">Student Name</label><input className="dm-input" value={leadForm.studentName} onChange={(e) => setLeadForm({ ...leadForm, studentName: e.target.value })} /></div>
              <div><label className="dm-label">Phone</label><input className="dm-input" value={leadForm.studentPhone} onChange={(e) => setLeadForm({ ...leadForm, studentPhone: e.target.value })} /></div>
              <div><label className="dm-label">Email</label><input className="dm-input" value={leadForm.studentEmail} onChange={(e) => setLeadForm({ ...leadForm, studentEmail: e.target.value })} /></div>
              <div><label className="dm-label">Parent</label><input className="dm-input" value={leadForm.parentName} onChange={(e) => setLeadForm({ ...leadForm, parentName: e.target.value })} /></div>
              <div><label className="dm-label">Class</label><input className="dm-input" value={leadForm.classGrade} onChange={(e) => setLeadForm({ ...leadForm, classGrade: e.target.value })} /></div>
              <div><label className="dm-label">School</label><input className="dm-input" value={leadForm.schoolCollege} onChange={(e) => setLeadForm({ ...leadForm, schoolCollege: e.target.value })} /></div>
              <div>
                <label className="dm-label">Status</label>
                <select className="dm-input" value={leadForm.status} onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}>
                  {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="dm-label">Priority</label>
                <select className="dm-input" value={leadForm.priority} onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}>
                  {['low', 'medium', 'high'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="dm-label">Follow-up</label><input type="date" className="dm-input" value={leadForm.followUpDate} onChange={(e) => setLeadForm({ ...leadForm, followUpDate: e.target.value })} /></div>
            </div>
            <div><label className="dm-label">Notes</label><textarea className="dm-input" value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} /></div>
            <div><label className="dm-label">Internal Notes</label><textarea className="dm-input" value={leadForm.adminNotes} onChange={(e) => setLeadForm({ ...leadForm, adminNotes: e.target.value })} /></div>
            <button type="submit" className="dm-btn-primary w-full">Save Lead Updates</button>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}
