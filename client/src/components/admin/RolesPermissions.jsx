import { useEffect, useState } from 'react';
import { api } from '../../api';
import { ROLE_LABELS } from '../../config/roleNavigation';
import AdminPageHeader from './AdminPageHeader';

const ALL_PERMISSIONS = [
  'dashboard.view', 'leads.view', 'leads.edit', 'leads.assign', 'leads.delete',
  'students.view', 'students.edit', 'students.assign',
  'partners.view', 'partners.edit', 'partners.approve', 'partners.delete',
  'agencies.view', 'agencies.edit', 'tasks.view', 'tasks.edit', 'tasks.assign',
  'calendar.view', 'calendar.edit', 'reports.view', 'reports.edit', 'reports.generate',
  'payments.view', 'payments.edit', 'payouts.view', 'payouts.approve',
  'commissions.view', 'commissions.edit', 'automations.view', 'automations.edit',
  'users.view', 'users.edit', 'users.delete', 'roles.view', 'roles.edit',
  'settings.view', 'settings.edit', 'audit.view', 'notifications.send', 'messages.send',
  'followups.view', 'followups.edit', 'calls.view', 'calls.edit',
  'counselling.view', 'counselling.edit', 'sessions.view', 'sessions.edit',
  'assessments.view', 'assessments.edit',
];

export default function RolesPermissions() {
  const [data, setData] = useState({ roles: [], defaults: {}, merged: {}, custom: {} });
  const [editingRole, setEditingRole] = useState(null);
  const [editPerms, setEditPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.roles();
      setData({
        roles: res.roles || [],
        defaults: res.defaults || {},
        merged: res.merged || {},
        custom: res.custom || {},
      });
    } catch (err) {
      setError(err.message || 'Failed to load roles. Super Admin access required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getPerms = (role) => data.merged[role] || data.defaults[role] || [];

  const startEdit = (role) => {
    setEditingRole(role);
    setEditPerms(getPerms(role).filter((p) => p !== '*'));
  };

  const togglePerm = (perm) => {
    setEditPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  const saveRole = async () => {
    if (!editingRole) return;
    setError('');
    try {
      const custom = { ...data.custom, [editingRole]: editPerms };
      const res = await api.admin.updateRoles(custom);
      setData((d) => ({
        ...d,
        custom: res.rolePermissions || custom,
        merged: { ...d.merged, [editingRole]: editPerms },
      }));
      setEditingRole(null);
      setMsg(`Permissions saved for ${ROLE_LABELS[editingRole] || editingRole}`);
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save permissions');
    }
  };

  const resetRole = async (role) => {
    if (!confirm(`Reset ${ROLE_LABELS[role]} to default permissions?`)) return;
    const custom = { ...data.custom };
    delete custom[role];
    await api.admin.updateRoles(custom);
    setMsg('Reset to defaults');
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) return <div className="dm-card p-12 text-center text-stone-400">Loading roles & permissions...</div>;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Roles & Permissions"
        subtitle="Super Admin has full access (*). Click Edit on any role to customize permissions."
        onRefresh={load}
      />
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {error && (
        <div className="dm-alert-error text-sm">
          {error}
          <button type="button" className="ml-2 underline" onClick={load}>Retry</button>
        </div>
      )}

      {!data.roles?.length && !error && (
        <div className="dm-card p-8 text-center text-stone-500">No roles found. Ensure you are logged in as Super Admin.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.roles?.map((role) => (
          <div key={role} className="dm-card p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-stone-800">{ROLE_LABELS[role] || role}</h3>
              <div className="flex gap-2">
                {role !== 'super_admin' && (
                  <>
                    <button type="button" className="dm-btn-ghost text-xs" onClick={() => startEdit(role)}>Edit</button>
                    <button type="button" className="dm-btn-ghost text-xs text-stone-500" onClick={() => resetRole(role)}>Reset</button>
                  </>
                )}
                {role === 'super_admin' && <span className="dm-badge bg-gold/20 text-gold-dark text-xs">Full Access *</span>}
              </div>
            </div>
            {editingRole === role ? (
              <div className="space-y-2">
                <p className="text-xs text-stone-500 mb-2">Check permissions for this role, then click Save below.</p>
                <div className="max-h-52 overflow-y-auto space-y-1 border border-stone-100 rounded-lg p-2">
                  {ALL_PERMISSIONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-stone-50 p-1 rounded">
                      <input type="checkbox" checked={editPerms.includes(p)} onChange={() => togglePerm(p)} />
                      {p}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" className="dm-btn-primary text-xs" onClick={saveRole}>Save Permissions</button>
                  <button type="button" className="dm-btn-ghost text-xs" onClick={() => setEditingRole(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <ul className="text-sm text-stone-600 space-y-1 max-h-40 overflow-y-auto">
                {getPerms(role).map((p) => <li key={p}>• {p}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
