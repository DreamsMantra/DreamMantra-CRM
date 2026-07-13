import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, IndianRupee } from 'lucide-react';
import { api } from '../../api';
import { formatCurrency } from '../../utils/constants';
import AdminPageHeader from './AdminPageHeader';

export default function PayoutQueue({ embedded = false }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [msg, setMsg] = useState('');

  const load = () => api.admin.payoutRequests({ status: filter === 'all' ? undefined : filter }).then((d) => setRequests(d.requests || []));

  useEffect(() => { load(); }, [filter]);

  const update = async (id, status) => {
    await api.admin.updatePayoutRequest(id, { status, processedAt: new Date().toISOString() });
    setMsg(`Payout ${status}`);
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  const pendingTotal = requests.filter((r) => r.status === 'pending').reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Payout Requests" subtitle={`Pending: ${formatCurrency(pendingTotal)}`} onRefresh={load} />}
      {embedded && <p className="text-sm text-stone-600">Pending payouts: <strong>{formatCurrency(pendingTotal)}</strong></p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <select className="dm-input w-auto max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="paid">Paid</option>
        <option value="rejected">Rejected</option>
        <option value="all">All</option>
      </select>

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="dm-card flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-semibold text-stone-900">{r.partner?.name || 'Partner'}</p>
              <p className="text-xs text-stone-500">{r.partner?.email} · {r.createdAt?.slice(0, 10)}</p>
              {r.notes && <p className="text-sm text-stone-600 mt-1">{r.notes}</p>}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-gold-dark flex items-center gap-1"><IndianRupee className="h-5 w-5" />{r.amount?.toLocaleString('en-IN')}</span>
              <span className={`dm-badge ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100'}`}>{r.status}</span>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button type="button" className="dm-btn-primary text-xs flex items-center gap-1" onClick={() => update(r.id, 'approved')}><CheckCircle className="h-3 w-3" /> Approve</button>
                  <button type="button" className="dm-btn-primary text-xs" onClick={() => update(r.id, 'paid')}>Mark Paid</button>
                  <button type="button" className="dm-btn-danger text-xs flex items-center gap-1" onClick={() => update(r.id, 'rejected')}><XCircle className="h-3 w-3" /> Reject</button>
                </div>
              )}
              {r.status === 'approved' && (
                <button type="button" className="dm-btn-primary text-xs" onClick={() => update(r.id, 'paid')}>Mark Paid</button>
              )}
            </div>
          </div>
        ))}
        {!requests.length && <div className="dm-card p-8 text-center text-stone-400">No payout requests</div>}
      </div>
    </div>
  );
}
