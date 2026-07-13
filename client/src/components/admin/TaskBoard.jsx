import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Trash2 } from 'lucide-react';
import { api } from '../../api';
import Modal from '../Modal';
import AdminPageHeader, { EditButton } from './AdminPageHeader';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['pending', 'in_progress', 'done'];

export default function TaskBoard({ staffUsers = [], embedded = false }) {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: '', dueDate: '', assignedTo: '', priority: 'medium', notes: '', status: 'pending' });
  const [showForm, setShowForm] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => api.admin.tasks().then((d) => setTasks(d.tasks || []));

  useEffect(() => { load(); }, []);

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
      {!embedded && <AdminPageHeader title="Task Management" subtitle={`${tasks.length} tasks`} onRefresh={load} onAdd={() => setShowForm(!showForm)} addLabel="New Task" />}
      {embedded && (
        <div className="flex justify-end">
          <button type="button" className="dm-btn-primary text-sm" onClick={() => setShowForm(!showForm)}>New Task</button>
        </div>
      )}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

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
        {columns.map((col) => (
          <div key={col.key} className={`dm-card border-t-4 ${col.color} p-4`}>
            <h3 className="font-semibold text-stone-800 mb-3">{col.label} ({tasks.filter((t) => (t.status || 'pending') === col.key).length})</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasks.filter((t) => (t.status || 'pending') === col.key).map((t) => {
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
        ))}
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
