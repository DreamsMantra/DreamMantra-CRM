import { useEffect, useState } from 'react';
import { Zap, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../../api';
import Modal from '../Modal';
import AdminPageHeader, { EditButton } from './AdminPageHeader';

const EMPTY_RULE = { name: '', trigger: 'status_change', toStatus: 'payment_done', action: 'notify_role', targetRole: 'sales_executive', active: true };

export default function AutomationRules({ embedded = false }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY_RULE);
  const [showForm, setShowForm] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api.admin.automations()
      .then((d) => setRules(d.automations || []))
      .catch((e) => setError(e.message || 'Failed to load automations'));
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.admin.createAutomation(form);
    setForm(EMPTY_RULE);
    setShowForm(false);
    setMsg('Automation created');
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ name: r.name, trigger: r.trigger, toStatus: r.toStatus || '', action: r.action, targetRole: r.targetRole || '', active: r.active !== false });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.admin.updateAutomation(editingId, form);
    setEditModal(false);
    setMsg('Automation updated');
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  const toggle = async (id, active) => {
    await api.admin.updateAutomation(id, { active: !active });
    load();
  };

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Automation Rules" subtitle="Workflows that run on status changes and SLA events" onRefresh={load} onAdd={() => setShowForm(!showForm)} addLabel="Add Rule" />}
      {embedded && (
        <div className="flex justify-end">
          <button type="button" className="dm-btn-primary text-sm" onClick={() => setShowForm(!showForm)}>Add Rule</button>
        </div>
      )}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={create} className="dm-card grid gap-3 p-4 md:grid-cols-2">
          <input className="dm-input md:col-span-2" placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="dm-input" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
            <option value="status_change">On status change</option>
            <option value="sla_overdue">SLA overdue</option>
          </select>
          <select className="dm-input" value={form.toStatus} onChange={(e) => setForm({ ...form, toStatus: e.target.value })}>
            {['new', 'contacted', 'payment_done', 'completed', 'counselling_booked', 'report_ready'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="dm-input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
            <option value="notify_role">Notify role</option>
            <option value="create_commission">Auto commission</option>
            <option value="notify_assignee">Notify assignee</option>
          </select>
          <select className="dm-input" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
            {['sales_executive', 'counsellor', 'report_management', 'admin'].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button type="submit" className="dm-btn-primary">Create Rule</button>
        </form>
      )}

      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="dm-card flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-stone-900 flex items-center gap-2"><Zap className="h-4 w-4 text-gold-dark" /> {r.name}</p>
              <p className="text-xs text-stone-500">{r.trigger} → {r.toStatus || `${r.hours || 24}h`} → {r.action} {r.targetRole && `(${r.targetRole})`}</p>
            </div>
            <div className="flex items-center gap-2">
              <EditButton onClick={() => openEdit(r)} />
              <button type="button" onClick={() => toggle(r.id, r.active)} className="text-stone-500 hover:text-gold-dark">
                {r.active !== false ? <ToggleRight className="h-6 w-6 text-emerald-600" /> : <ToggleLeft className="h-6 w-6" />}
              </button>
              <button type="button" className="dm-btn-danger text-xs" onClick={() => api.admin.deleteAutomation(r.id).then(load)}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {!rules.length && !error && <div className="dm-card p-8 text-center text-stone-400">No automation rules yet</div>}
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Update Automation">
        <form onSubmit={saveEdit} className="space-y-3">
          <input className="dm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="dm-input" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
            <option value="status_change">On status change</option>
            <option value="sla_overdue">SLA overdue</option>
          </select>
          <select className="dm-input" value={form.toStatus} onChange={(e) => setForm({ ...form, toStatus: e.target.value })}>
            {['new', 'contacted', 'payment_done', 'completed', 'counselling_booked', 'report_ready'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="dm-input" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
            <option value="notify_role">Notify role</option>
            <option value="create_commission">Auto commission</option>
            <option value="notify_assignee">Notify assignee</option>
          </select>
          <select className="dm-input" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
            {['sales_executive', 'counsellor', 'report_management', 'admin'].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button type="submit" className="dm-btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
    </div>
  );
}
