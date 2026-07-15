import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, Trash2 } from 'lucide-react';
import { api } from '../../api';
import Modal from '../Modal';
import AdminPageHeader, { EditButton } from './AdminPageHeader';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['pending', 'in_progress', 'done'];

function dayStart(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function TaskBoard({ staffUsers = [], embedded = false }) {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: '', dueDate: '', assignedTo: '', priority: 'medium', notes: '', status: 'pending' });
  const [showForm, setShowForm] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDueFrom, setFilterDueFrom] = useState('');
  const [filterDueTo, setFilterDueTo] = useState('');

  const load = () => api.admin.tasks().then((d) => setTasks(d.tasks || []));

  useEffect(() => { load(); }, []);

  const filteredTasks = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filterAssignee !== 'all' && (t.assignedTo || '') !== filterAssignee) return false;
      if (filterStatus !== 'all' && (t.status || 'pending') !== filterStatus) return false;
      if (filterPriority !== 'all' && (t.priority || 'medium') !== filterPriority) return false;
      if (filterDueFrom || filterDueTo) {
        const due = dayStart(t.dueDate);
        if (due == null) return false;
        if (filterDueFrom && due < dayStart(filterDueFrom)) return false;
        if (filterDueTo) {
          const end = dayStart(filterDueTo);
          if (end != null && due > end) return false;
        }
      }
      if (q) {
        const assignee = staffUsers.find((u) => u.id === t.assignedTo);
        const hay = `${t.title || ''} ${t.notes || ''} ${assignee?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filterSearch, filterAssignee, filterStatus, filterPriority, filterDueFrom, filterDueTo, staffUsers]);

  const create = async (e) => {
    e.preventDefault();
    await api.admin.createTask(form);
    setForm({ title: '', dueDate: '', assignedTo: '', priority: 'medium', notes: '', status: 'pending' });
    setShowForm(false);
    setMsg('Task created');
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      title: t.title || '',
      dueDate: t.dueDate?.slice?.(0, 10) || t.dueDate || '',
      assignedTo: t.assignedTo || '',
      priority: t.priority || 'medium',
      notes: t.notes || '',
      status: t.status || 'pending',
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.admin.updateTask(editingId, form);
    setEditModal(false);
    setMsg('Task updated');
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  const updateStatus = async (id, status) => {
    await api.admin.updateTask(id, { status });
    load();
  };

  const columns = [
    { key: 'pending', label: 'To Do', color: 'border-stone-300' },
    { key: 'in_progress', label: 'In Progress', color: 'border-blue-400' },
    { key: 'done', label: 'Done', color: 'border-emerald-400' },
  ];

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Task Management" subtitle={`${filteredTasks.length} / ${tasks.length} tasks`} onRefresh={load} onAdd={() => setShowForm(!showForm)} addLabel="New Task" />}
      {embedded && (
        <div className="flex justify-end">
          <button type="button" className="dm-btn-primary text-sm" onClick={() => setShowForm(!showForm)}>New Task</button>
        </div>
      )}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <input
          className="dm-input min-w-[160px] flex-1"
          placeholder="Search tasks…"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
        />
        <select className="dm-input w-auto" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="all">All assignees</option>
          <option value="">Unassigned</option>
          {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="dm-input w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="dm-input w-auto" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div>
          <label className="dm-label text-xs">Due from</label>
          <input type="date" className="dm-input w-auto" value={filterDueFrom} onChange={(e) => setFilterDueFrom(e.target.value)} />
        </div>
        <div>
          <label className="dm-label text-xs">Due to</label>
          <input type="date" className="dm-input w-auto" value={filterDueTo} onChange={(e) => setFilterDueTo(e.target.value)} />
        </div>
      </div>

      {showForm && (
        <form onSubmit={create} className="dm-card grid gap-3 p-4 md:grid-cols-2">
          <input className="dm-input md:col-span-2" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input type="date" className="dm-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <select className="dm-input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
            <option value="">Unassigned</option>
            {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
          <select className="dm-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <textarea className="dm-input md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="dm-btn-primary">Create Task</button>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col) => {
          if (filterStatus !== 'all' && filterStatus !== col.key) return null;
          const colTasks = filteredTasks.filter((t) => (t.status || 'pending') === col.key);
          return (
            <div key={col.key} className={`dm-card border-t-4 ${col.color} p-4`}>
              <h3 className="font-semibold text-stone-800 mb-3">{col.label} ({colTasks.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {colTasks.map((t) => {
                  const assignee = staffUsers.find((u) => u.id === t.assignedTo);
                  return (
                    <div key={t.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                      <p className="font-medium text-stone-900">{t.title}</p>
                      {t.dueDate && <p className="text-xs text-stone-500 flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {t.dueDate}</p>}
                      {assignee && <p className="text-xs text-stone-500 mt-1">→ {assignee.name}</p>}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <EditButton onClick={() => openEdit(t)} />
                        {col.key !== 'done' && (
                          <button type="button" className="dm-btn-ghost text-xs" onClick={() => updateStatus(t.id, col.key === 'pending' ? 'in_progress' : 'done')}>
                            <CheckCircle className="h-3 w-3" />
                          </button>
                        )}
                        <button type="button" className="dm-btn-ghost text-xs text-red-500" onClick={() => api.admin.deleteTask(t.id).then(load)}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Update Task">
        <form onSubmit={saveEdit} className="space-y-3">
          <input className="dm-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input type="date" className="dm-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <select className="dm-input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
            <option value="">Unassigned</option>
            {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="dm-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className="dm-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <textarea className="dm-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="dm-btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
    </div>
  );
}
