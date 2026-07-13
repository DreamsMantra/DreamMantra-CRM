import { Plus, Edit2, Trash2 } from 'lucide-react';
import DashboardSection from '../../../components/layout/DashboardSection';
import StatCard from '../../../components/StatCard';
import BarChart from '../../../components/charts/BarChart';
import ConversionFunnel from '../../../components/charts/ConversionFunnel';
import ExportButton from '../../../components/ExportButton';
import { BulkActionBar, SelectCheckbox } from '../../../components/admin/AdminTools';
import PaymentTracker from '../../../components/admin/PaymentTracker';
import PayoutQueue from '../../../components/admin/PayoutQueue';
import { ADMIN_SUB_TABS } from '../../../config/adminTabs';
import { leadDisplayName } from '../../../config/adminTabs';
import { formatCurrency } from '../../../utils/constants';
import { api } from '../../../api';

export default function AdminFinancePanel({
  pageInfo, sub, setSub, commissions, selectedCommissions, setSelectedCommissions,
  leads, token, load, toggleAll, flash, setCommissionModal, setEditCommission,
}) {
  return (
    <DashboardSection
      title={pageInfo.title}
      description={pageInfo.desc}
      subTabs={ADMIN_SUB_TABS.finance}
      activeSub={sub}
      onSubChange={setSub}
    >
      {sub === 'commissions' && (
        <div className="space-y-4">
          <BulkActionBar selected={selectedCommissions} onClear={() => setSelectedCommissions([])} actions={[
            { label: 'Approve All', onClick: async () => { await api.admin.bulkCommissionAction(selectedCommissions, 'approved'); flash('Approved'); setSelectedCommissions([]); load(); } },
            { label: 'Mark Paid', onClick: async () => { await api.admin.bulkCommissionAction(selectedCommissions, 'paid'); flash('Paid'); setSelectedCommissions([]); load(); } },
          ]} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setCommissionModal(true)} className="dm-btn-primary"><Plus className="h-4 w-4" /> Add Manual Commission</button>
            <ExportButton href={api.admin.exportCommissions()} token={token} />
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead>
                <tr>
                  <th><SelectCheckbox checked={selectedCommissions.length === commissions.length && commissions.length > 0} onChange={() => toggleAll(commissions, selectedCommissions, setSelectedCommissions)} /></th>
                  <th>Partner</th><th>Lead</th><th>Amount</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id || c._id}>
                    <td><SelectCheckbox checked={selectedCommissions.includes(c.id || c._id)} onChange={() => setSelectedCommissions((s) => { const id = c.id || c._id; return s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; })} /></td>
                    <td>{c.partner?.name}</td>
                    <td className="font-mono text-gold-dark">{c.lead?.leadId} — {leadDisplayName(c.lead || {})}</td>
                    <td className="font-semibold text-emerald-600">{formatCurrency(c.amount)}</td>
                    <td><span className="dm-badge bg-stone-100 capitalize">{c.status}</span></td>
                    <td className="space-x-2">
                      <button type="button" onClick={() => setEditCommission({ ...c, id: c.id || c._id })} className="text-gold-dark"><Edit2 className="h-3 w-3 inline" /></button>
                      {c.status === 'pending' && <button type="button" onClick={() => api.admin.updateCommission(c.id || c._id, { status: 'approved' }).then(load)} className="text-xs text-blue-600">Approve</button>}
                      {c.status === 'approved' && <button type="button" onClick={() => api.admin.updateCommission(c.id || c._id, { status: 'paid' }).then(load)} className="dm-btn-primary text-xs py-1">Pay</button>}
                      <button type="button" onClick={async () => { if (confirm('Delete?')) { await api.admin.deleteCommission(c.id || c._id); load(); } }} className="text-xs text-red-600"><Trash2 className="h-3 w-3 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sub === 'payments' && <PaymentTracker leads={leads} embedded />}
      {sub === 'payouts' && <PayoutQueue embedded />}
    </DashboardSection>
  );
}

export function AdminReportsPanel({ pageInfo, reports }) {
  return (
    <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
      {!reports && <div className="dm-card p-12 text-center text-stone-400">Loading reports...</div>}
      {reports && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Conversion Rate" value={`${reports.conversionRate}%`} accent="green" />
            <StatCard label="Revenue Pipeline" value={formatCurrency(reports.revenuePipeline)} accent="gold" />
            <StatCard label="Partners" value={reports.partnerPerformance?.length} accent="blue" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="dm-card p-5"><h3 className="dm-section-title mb-4">12-Month Trend</h3><BarChart data={reports.monthlyTrends} color="orange" /></div>
            <div className="dm-card p-5"><h3 className="dm-section-title mb-4">Funnel</h3><ConversionFunnel data={reports.funnel} /></div>
          </div>
        </div>
      )}
    </DashboardSection>
  );
}
