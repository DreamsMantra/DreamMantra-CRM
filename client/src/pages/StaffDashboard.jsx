import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import DashboardSection from '../components/layout/DashboardSection';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import FollowUpList from '../components/FollowUpList';
import StudentsPanel from '../components/admin/StudentsPanel';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { getNavForRole, getDashboardTitle } from '../config/roleNavigation';
import { resolveStaffRoute, isStaffPlaceholderTab } from '../config/staffTabs';
import { formatDate, formatCurrency } from '../utils/constants';

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

  const role = user?.role;
  const sidebarLinks = getNavForRole(role).map((l) => ({ ...l, badge: 0 }));

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = useCallback(async () => {
    const [dash, leadRes, taskRes, reportRes, fu] = await Promise.all([
      api.staff.dashboard(),
      api.staff.leads(),
      api.staff.tasks(),
      api.staff.reports(),
      api.staff.followUps(),
    ]);
    setDashboard(dash);
    setLeads(leadRes.leads || []);
    setTasks(taskRes.tasks || []);
    setReports(reportRes.reports || []);
    setFollowUps(fu);
    if (['sessions', 'notes', 'history', 'overview'].includes(tab) && role === 'counsellor') {
      const s = await api.staff.sessions();
      setSessions(s.sessions || []);
    }
    if (tab === 'calls' && role === 'sales_executive') {
      const c = await api.staff.calls();
      setCalls(c.calls || []);
    }
  }, [tab, role]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const title = getDashboardTitle(role);

  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t });

  return (
    <DashboardLayout
      sidebarLinks={sidebarLinks}
      activeTab={tab}
      onTabChange={setTab}
      title={`Dream Mantra · ${title}`}
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
                <div key={l.id} className="flex justify-between items-center border-b border-stone-100 py-2">
                  <div><p className="font-medium">{l.studentName}</p><p className="text-xs text-stone-500">{l.leadId}</p></div>
                  <StatusBadge status={l.status} />
                </div>
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
            <thead><tr><th>ID</th><th>Student</th><th>Mobile</th><th>Product</th><th>Status</th><th>Follow-up</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs">{l.leadId}</td>
                  <td>{l.studentName}</td>
                  <td>{l.studentPhone}</td>
                  <td className="text-xs">{(l.interestedIn || []).join(', ')}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>{formatDate(l.followUpDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </DashboardSection>
      )}

      {tab === 'students' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <StudentsPanel embedded />
        </DashboardSection>
      )}

      {tab === 'follow-ups' && (
        <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
          <FollowUpList overdue={followUps.overdue} upcoming={followUps.upcoming} />
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
    </DashboardLayout>
  );
}
