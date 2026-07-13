import { useEffect, useState } from 'react';
import { api } from '../../api';
import AdminPageHeader from './AdminPageHeader';
export default function AuditLog({ embedded = false }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.admin.auditLog(200).then((d) => setLogs(d.logs || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Audit Log" subtitle="Immutable record of critical actions (Super Admin only)" onRefresh={load} />}

      <div className="dm-card overflow-x-auto">
        <table className="dm-table w-full text-sm">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-stone-400">Loading...</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id}>
                <td className="text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.userName}</td>
                <td><span className="dm-badge bg-stone-100 text-stone-700 text-xs">{l.action}</span></td>
                <td className="text-xs">{l.entityType}{l.entityId ? ` #${l.entityId.slice(0, 8)}` : ''}</td>
                <td className="text-stone-600 max-w-xs truncate">{l.details}</td>
              </tr>
            ))}
            {!loading && !logs.length && <tr><td colSpan={5} className="text-center py-8 text-stone-400">No audit entries yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
