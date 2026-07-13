import { useEffect, useState } from 'react';
import { api } from '../../api';
import { ROLE_LABELS } from '../../config/roleNavigation';
import Modal from '../Modal';

const EMPTY = { name: '', email: '', password: '', role: 'sales_executive', phone: '', status: 'active' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const data = await api.admin.users(filter === 'all' ? {} : { role: filter });
    setUsers(data.users || []);
  };

  useEffect(() => { load().catch(() => {}); }, [filter]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const save = async (e) => {
    e.preventDefault();
    if (editing) {
      await api.admin.updateUser(editing.id, form);
      flash('User updated');
    } else {
      await api.admin.createUser(form);
      flash('User created');
    }
    setModal(false);
    setEditing(null);
    setForm(EMPTY);
    load();
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', status: u.status });
    setModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="dm-section-title">User Management</h2>
        <div className="flex gap-2">
          <select className="dm-input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'partner').map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button type="button" className="dm-btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setModal(true); }}>+ Add User</button>
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      <div className="dm-card overflow-x-auto">
        <table className="dm-table w-full">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td><span className="dm-badge">{ROLE_LABELS[u.role] || u.role}</span></td>
                <td>{u.status}</td>
                <td className="space-x-2">
                  <button type="button" className="text-gold-dark text-sm" onClick={() => openEdit(u)}>Edit</button>
                  {u.role !== 'super_admin' && (
                    <button type="button" className="text-red-500 text-sm" onClick={async () => { if (confirm('Delete user?')) { await api.admin.deleteUser(u.id); load(); } }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="p-6 text-stone-500 text-center">No staff users yet. Add Sales, Counsellor, or Report team members.</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit User' : 'Add Staff User'}>
        <form onSubmit={save} className="space-y-3">
          <input className="dm-input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="dm-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="dm-input" type="password" placeholder={editing ? 'New password (optional)' : 'Password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(editing ? {} : { required: true })} />
          <input className="dm-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="dm-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={editing?.role === 'super_admin'}>
            {['super_admin', 'admin', 'sales_executive', 'counsellor', 'report_management'].map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <select className="dm-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button type="submit" className="dm-btn-primary w-full">{editing ? 'Save Changes' : 'Create User'}</button>
        </form>
      </Modal>
    </div>
  );
}
