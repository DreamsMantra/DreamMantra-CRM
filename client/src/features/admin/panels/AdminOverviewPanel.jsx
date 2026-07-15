import {
  Plus, UserPlus, Columns3, Users, ClipboardList, TrendingUp, IndianRupee,
} from 'lucide-react';
import DashboardSection from '../../../components/layout/DashboardSection';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import ActivityFeed from '../../../components/ActivityFeed';
import { leadDisplayName } from '../../../config/adminTabs';
import { formatCurrency } from '../../../utils/constants';

export default function AdminOverviewPanel({
  pageInfo, dashboard, activities, duplicates, enterprise, onQuickLead, onPartnerCreate, onTab,
  onOpenLead,
}) {
  if (!dashboard) {
    return <div className="dm-card p-12 text-center text-stone-400">Loading...</div>;
  }

  return (
    <DashboardSection title={pageInfo.title} description={pageInfo.desc}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" onClick={() => onQuickLead('student')} className="dm-card p-5 text-left transition hover:border-orange/40 hover:shadow-md">
          <Plus className="mb-2 h-6 w-6 text-orange" />
          <p className="font-semibold text-stone-900">Add Potential Student</p>
          <p className="text-xs text-stone-500">B2C student lead</p>
        </button>
        <button type="button" onClick={() => onQuickLead('business')} className="dm-card p-5 text-left transition hover:border-indigo-300 hover:shadow-md">
          <Plus className="mb-2 h-6 w-6 text-indigo-600" />
          <p className="font-semibold text-stone-900">Add Potential Partner</p>
          <p className="text-xs text-stone-500">School / college / B2B lead</p>
        </button>
        <button type="button" onClick={() => onPartnerCreate(false)} className="dm-card p-5 text-left transition hover:border-gold/40 hover:shadow-md">
          <UserPlus className="mb-2 h-6 w-6 text-gold-dark" />
          <p className="font-semibold text-stone-900">Add Partner Account</p>
          <p className="text-xs text-stone-500">Create login & credentials</p>
        </button>
        <button type="button" onClick={() => onTab?.('leads', { view: 'board' })} className="dm-card p-5 text-left transition hover:border-stone-300 hover:shadow-md">
          <Columns3 className="mb-2 h-6 w-6 text-stone-600" />
          <p className="font-semibold text-stone-900">Lead Board</p>
          <p className="text-xs text-stone-500">Drag to update status</p>
        </button>
      </div>

      {(dashboard.stats?.pendingPartners > 0 || dashboard.followUpCounts?.overdue > 0 || duplicates.length > 0) && (
        <div className="dm-card space-y-2 p-4">
          <p className="text-sm font-semibold text-stone-700">Needs your attention</p>
          {dashboard.stats?.pendingPartners > 0 && (
            <button type="button" onClick={() => onTab?.('partners', { partnerFilter: 'pending' })} className="flex w-full items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
              <span>{dashboard.stats.pendingPartners} partner(s) waiting approval</span><span className="font-semibold">Review →</span>
            </button>
          )}
          {dashboard.followUpCounts?.overdue > 0 && (
            <button type="button" onClick={() => onTab?.('leads', { panel: 'followups' })} className="flex w-full items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 hover:bg-red-100">
              <span>{dashboard.followUpCounts.overdue} overdue follow-up(s)</span><span className="font-semibold">View →</span>
            </button>
          )}
          {duplicates.length > 0 && (
            <button type="button" onClick={() => onTab?.('leads', { panel: 'duplicates' })} className="flex w-full items-center justify-between rounded-lg bg-orange/10 px-4 py-3 text-sm text-orange hover:bg-orange/15">
              <span>{duplicates.length} duplicate phone group(s)</span><span className="font-semibold">Fix →</span>
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active Partners" value={dashboard.stats.activePartners} sub={`${dashboard.stats.pendingPartners} pending`} accent="gold" onClick={() => onTab?.('partners', { partnerFilter: 'active' })} />
        <StatCard icon={ClipboardList} label="Total Leads" value={dashboard.stats.totalLeads} sub={`${dashboard.stats.leadsThisMonth} this month`} accent="orange" onClick={() => onTab?.('leads')} />
        <StatCard icon={TrendingUp} label="Converted" value={dashboard.stats.convertedLeads} accent="green" onClick={() => onTab?.('leads', { panel: 'none' })} />
        <StatCard icon={IndianRupee} label="Paid Out" value={formatCurrency(dashboard.stats.totalCommissionPaid)} sub={`${dashboard.stats.pendingCommissions} pending`} accent="blue" onClick={() => onTab?.('finance', { sub: 'commissions' })} />
      </div>

      {enterprise && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Open Tasks" value={enterprise.openTasks || 0} accent="blue" onClick={() => onTab?.('team', { inner: 'tasks' })} />
          <StatCard label="Pending Payouts" value={enterprise.pendingPayouts || 0} accent="gold" onClick={() => onTab?.('finance', { sub: 'payouts' })} />
          <StatCard label="Automations" value={enterprise.automationCount || 0} accent="orange" onClick={() => onTab?.('tools')} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dm-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 p-4">
            <h3 className="dm-section-title">Recent Leads</h3>
            <button type="button" className="text-xs font-medium text-gold-dark" onClick={() => onTab('leads')}>View all →</button>
          </div>
          <table className="dm-table w-full">
            <tbody>
              {dashboard.recentLeads.map((lead) => (
                <tr key={lead.id || lead._id} className="cursor-pointer" onClick={() => onOpenLead(lead)}>
                  <td className="font-mono text-gold-dark">{lead.leadId}</td>
                  <td>{leadDisplayName(lead)}</td>
                  <td><StatusBadge status={lead.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dm-card p-5">
          <h3 className="dm-section-title mb-4">Recent Activity</h3>
          <ActivityFeed activities={dashboard.recentActivity || activities} limit={8} />
        </div>
      </div>
    </DashboardSection>
  );
}
