import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatCurrency } from '../../utils/constants';
import Modal from '../Modal';
import AdminPageHeader, { EditButton } from './AdminPageHeader';

const METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'razorpay'];

export default function PaymentTracker({ leads = [], embedded = false }) {
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ leadId: '', amount: '', method: 'upi', reference: '', notes: '', status: 'received' });
  const [showForm, setShowForm] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => api.admin.payments().then((d) => setPayments(d.payments || []));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.admin.createPayment({ ...form, amount: Number(form.amount) });
    setForm({ leadId: '', amount: '', method: 'upi', reference: '', notes: '', status: 'received' });
    setShowForm(false);
    setMsg('Payment recorded');
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      amount: p.amount,
      method: p.method || 'upi',
      reference: p.reference || '',
      notes: p.notes || '',
      status: p.status || 'received',
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await api.admin.updatePayment(editingId, { ...form, amount: Number(form.amount) });
    setEditModal(false);
    setMsg('Payment updated');
    load();
    setTimeout(() => setMsg(''), 3000);
  };

  const total = payments.filter((p) => p.status === 'received').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      {!embedded && (
        <AdminPageHeader
          title="Payment Collection"
          subtitle={`Total collected: ${formatCurrency(total)}`}
          onRefresh={load}
          onAdd={() => setShowForm(!showForm)}
          addLabel="Record Payment"
        />
      )}
      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-stone-600">Total collected: <strong>{formatCurrency(total)}</strong></p>
          <button type="button" className="dm-btn-primary text-sm" onClick={() => setShowForm(!showForm)}>Record Payment</button>
        </div>
      )}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      {showForm && (
        <form onSubmit={submit} className="dm-card grid gap-3 p-4 md:grid-cols-2">
          <select className="dm-input md:col-span-2" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} required>
            <option value="">Select lead</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.leadId} — {l.studentName}</option>)}
          </select>
          <input type="number" className="dm-input" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <select className="dm-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="dm-input" placeholder="Reference / UTR" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <input className="dm-input" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="dm-btn-primary">Save Payment</button>
        </form>
      )}

      <div className="dm-card overflow-x-auto">
        <table className="dm-table w-full text-sm">
          <thead><tr><th>Date</th><th>Lead</th><th>Student</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.createdAt?.slice(0, 10)}</td>
                <td className="font-mono text-xs">{p.lead?.leadId || p.leadId}</td>
                <td>{p.lead?.studentName || '—'}</td>
                <td className="font-semibold text-gold-dark">{formatCurrency(p.amount)}</td>
                <td>{p.method}</td>
                <td className="text-xs">{p.reference || '—'}</td>
                <td><span className="dm-badge bg-emerald-100 text-emerald-700">{p.status}</span></td>
                <td><EditButton onClick={() => openEdit(p)} /></td>
              </tr>
            ))}
            {!payments.length && <tr><td colSpan={8} className="text-center py-8 text-stone-400">No payments recorded yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Update Payment">
        <form onSubmit={saveEdit} className="space-y-3">
          <input type="number" className="dm-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <select className="dm-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="dm-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <input className="dm-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <select className="dm-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {['received', 'pending', 'refunded', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="dm-btn-primary w-full">Save Changes</button>
        </form>
      </Modal>
    </div>
  );
}
