import { useEffect, useState } from 'react';
import { Pencil, RotateCcw, Shield } from 'lucide-react';
import { api } from '../../api';
import { ROLE_LABELS } from '../../config/roleNavigation';
import AdminPageHeader from './AdminPageHeader';
import Modal from '../Modal';

const PERMISSION_GROUPS = [
  { title: 'Dashboard & Leads', keys: ['dashboard.view', 'leads.view', 'leads.edit', 'leads.assign', 'leads.delete', 'leads.own', 'leads.create'] },
  { title: 'Students & Follow-ups', keys: ['students.view', 'students.edit', 'students.assign', 'followups.view', 'followups.edit', 'calls.view', 'calls.edit'] },
  { title: 'Partners & Agencies', keys: ['partners.view', 'partners.edit', 'partners.approve', 'partners.delete', 'agencies.view', 'agencies.edit'] },
  { title: 'Team & Calendar', keys: ['tasks.view', 'tasks.edit', 'tasks.assign', 'calendar.view', 'calendar.edit', 'messages.send', 'notifications.send'] },
  { title: 'Finance', keys: ['payments.view', 'payments.edit', 'payouts.view', 'payouts.approve', 'commissions.view', 'commissions.edit'] },
  { title: 'Reports & Ops', keys: ['reports.view', 'reports.edit', 'reports.generate', 'automations.view', 'automations.edit', 'audit.view'] },
  { title: 'Admin', keys: ['users.view', 'users.edit', 'users.delete', 'roles.view', 'roles.edit', 'settings.view', 'settings.edit'] },
  { title: 'Counselling', keys: ['counselling.view', 'counselling.edit', 'sessions.view', 'sessions.edit', 'assessments.view', 'assessments.edit'] },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.keys);

export default function RolesPermissions() {
  const [data, setData] = useState({ roles: [], defaults: {}, merged: {}, custom: {} });
  const [editingRole, setEditingRole] = useState(null);
  const [editPerms, setEditPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    setError('');
    setEditingRole(role);
    setEditPerms(getPerms(role).filter((p) => p !== '*'));
  };

  const togglePerm = (perm) => {
    setEditPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  const toggleGroup = (keys) => {
    const allOn = keys.every((k) => editPerms.includes(k));
    setEditPerms((prev) => {
      if (allOn) return prev.filter((p) => !keys.includes(p));
      return Array.from(new Set([...prev, ...keys]));
    });
  };

  const saveRole = async () => {
    if (!editingRole) return;
    setSaving(true);
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
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const resetRole = async (role) => {
    if (!confirm(`Reset ${ROLE_LABELS[role] || role} to default permissions?`)) return;
    setError('');
    try {
      const custom = { ...data.custom };
      delete custom[role];
      await api.admin.updateRoles(custom);
      setMsg('Reset to defaults');
      setTimeout(() => setMsg(''), 3000);
      if (editingRole === role) setEditingRole(null);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to reset');
    }
  };

  if (loading) return <div className="dm-card p-12 text-center text-stone-400">Loading roles & permissions...</div>;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Roles & Permissions"
        subtitle="Super Admin has full access (*). Click Edit to open the permission editor."
        onRefresh={load}
      />
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {error && !editingRole && (
        <div className="dm-alert-error text-sm">
          {error}
          <button type="button" className="ml-2 underline" onClick={load}>Retry</button>
        </div>
      )}

      {!data.roles?.length && !error && (
        <div className="dm-card p-8 text-center text-stone-500">No roles found. Ensure you are logged in as Super Admin.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.roles?.map((role) => {
          const perms = getPerms(role);
          const isCustom = Array.isArray(data.custom?.[role]);
          return (
            <div key={role} className="dm-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gold-dark" />
                  <h3 className="font-semibold text-stone-800">{ROLE_LABELS[role] || role}</h3>
                  {isCustom && role !== 'super_admin' && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Custom</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {role !== 'super_admin' ? (
                    <>
                      <button type="button" className="dm-btn-primary text-xs" onClick={() => startEdit(role)}>
                        <Pencil className="mr-1 inline h-3 w-3" /> Edit
                      </button>
                      <button type="button" className="dm-btn-ghost text-xs text-stone-500" onClick={() => resetRole(role)}>
                        <RotateCcw className="mr-1 inline h-3 w-3" /> Reset
                      </button>
                    </>
                  ) : (
                    <span className="dm-badge bg-gold/20 text-gold-dark text-xs">Full Access *</span>
                  )}
                </div>
              </div>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-sm text-stone-600">
                {perms.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!editingRole}
        onClose={() => setEditingRole(null)}
        title={`Edit: ${ROLE_LABELS[editingRole] || editingRole || ''}`}
        wide
      >
        {editingRole && (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              Toggle permissions for this role, then save. Changes apply to new sessions for staff with this role.
            </p>
            {error && <div className="dm-alert-error text-sm">{error}</div>}
            <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const keys = group.keys.filter((k) => ALL_PERMISSIONS.includes(k));
                const allOn = keys.every((k) => editPerms.includes(k));
                return (
                  <div key={group.title} className="rounded-xl border border-stone-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-800">{group.title}</p>
                      <button type="button" className="text-xs font-medium text-gold-dark hover:underline" onClick={() => toggleGroup(keys)}>
                        {allOn ? 'Clear group' : 'Select all'}
                      </button>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {keys.map((p) => (
                        <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-stone-50">
                          <input type="checkbox" checked={editPerms.includes(p)} onChange={() => togglePerm(p)} />
                          <span className="font-mono text-stone-700">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4">
              <button type="button" className="dm-btn-primary" disabled={saving} onClick={saveRole}>
                {saving ? 'Saving…' : 'Save Permissions'}
              </button>
              <button type="button" className="dm-btn-ghost" onClick={() => setEditingRole(null)}>Cancel</button>
              <button type="button" className="dm-btn-ghost text-stone-500" onClick={() => resetRole(editingRole)}>Reset to defaults</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
