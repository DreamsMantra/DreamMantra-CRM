import { useState } from 'react';
import { api } from '../../api';
import StatusBadge from '../StatusBadge';
import { leadDisplayName, leadDisplayPhone } from '../../config/adminTabs';

export default function LeadAssignments({ leads = [], staffUsers = [], onRefresh }) {
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('unassigned');

  const sales = staffUsers.filter((u) => u.role === 'sales_executive');
  const counsellors = staffUsers.filter((u) => u.role === 'counsellor');

  const rows = leads.filter((l) => {
    if (filter === 'unassigned') return !l.assignedSalesId && !l.assignedCounsellorId;
    if (filter === 'sales') return !l.assignedSalesId;
    if (filter === 'counsellor') return !l.assignedCounsellorId;
    return true;
  });

  const assign = async (leadId, field, value) => {
    const body = { [field]: value || null };
    if (field === 'assignedSalesId') body.assignedTo = value || null;
    await api.admin.updateLead(leadId, body);
    setMsg('Assignment saved');
    setTimeout(() => setMsg(''), 2500);
    onRefresh?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="dm-section-title">Lead Assignments</h2>
          <p className="text-sm text-stone-500">Assign sales executives and counsellors to leads</p>
        </div>
        <select className="dm-input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="unassigned">Unassigned (both)</option>
          <option value="sales">Missing sales</option>
          <option value="counsellor">Missing counsellor</option>
          <option value="all">All leads</option>
        </select>
      </div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      <div className="dm-card overflow-x-auto">
        <table className="dm-table w-full">
          <thead>
            <tr>
              <th>Dreamz ID</th><th>Contact</th><th>Status</th><th>Sales</th><th>Counsellor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id || l._id}>
                <td className="font-mono text-xs text-gold-dark">{l.leadId}<br /><span className="font-sans font-medium text-stone-800">{leadDisplayName(l)}</span></td>
                <td className="text-sm">{leadDisplayPhone(l)}</td>
                <td><StatusBadge status={l.status} /></td>
                <td>
                  <select className="dm-input text-xs py-1" value={l.assignedSalesId || ''} onChange={(e) => assign(l.id || l._id, 'assignedSalesId', e.target.value)}>
                    <option value="">Unassigned</option>
                    {sales.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="dm-input text-xs py-1" value={l.assignedCounsellorId || ''} onChange={(e) => assign(l.id || l._id, 'assignedCounsellorId', e.target.value)}>
                    <option value="">Unassigned</option>
                    {counsellors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-8 text-center text-stone-500">No leads match this filter.</p>}
      </div>
    </div>
  );
}
