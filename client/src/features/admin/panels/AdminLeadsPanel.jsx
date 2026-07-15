import { Plus, Search } from 'lucide-react';
import DashboardSection from '../../../components/layout/DashboardSection';
import StatusBadge from '../../../components/StatusBadge';
import FollowUpList from '../../../components/FollowUpList';
import LeadKanban from '../../../components/LeadKanban';
import PartnerSelect from '../../../components/PartnerSelect';
import { BulkActionBar, SelectCheckbox } from '../../../components/admin/AdminTools';
import { LEAD_STATUSES, formatDate } from '../../../utils/constants';
import { leadDisplayName, leadDisplayPhone, leadLifecycleLabel } from '../../../config/adminTabs';
import { api } from '../../../api';

const PRIORITIES = ['low', 'medium', 'high'];

function dayStart(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function filterLeadsClient(leads, { dateFrom, dateTo, assignee }) {
  return (leads || []).filter((l) => {
    if (dateFrom || dateTo) {
      const created = dayStart(l.createdAt);
      if (created == null) return false;
      if (dateFrom && created < dayStart(dateFrom)) return false;
      if (dateTo) {
        const end = dayStart(dateTo);
        if (end != null && created > end) return false;
      }
    }
    if (assignee && assignee !== 'all') {
      const id = l.assignedTo || l.assignedSalesId || l.assignedCounsellorId || '';
      if (id !== assignee) return false;
    }
    return true;
  });
}

export default function AdminLeadsPanel({
  pageInfo, leads, partners, followUps, duplicates, leadViewMode, setLeadViewMode,
  leadTypeFilter, setLeadTypeFilter, leadsPanel, setLeadsPanel, leadFilter, setLeadFilter,
  leadPartnerFilter, setLeadPartnerFilter, search, setSearch, selectedLeads, setSelectedLeads,
  leadPriorityFilter, setLeadPriorityFilter, leadDateFrom, setLeadDateFrom, leadDateTo, setLeadDateTo,
  leadAssigneeFilter, setLeadAssigneeFilter, staffUsers = [],
  load, toggleAll, bulkLeads, openQuickLead, openLeadDetail, flash,
}) {
  const displayLeads = filterLeadsClient(leads, {
    dateFrom: leadDateFrom,
    dateTo: leadDateTo,
    assignee: leadAssigneeFilter,
  });

  return (
    <DashboardSection
      title={pageInfo.title}
      description={pageInfo.desc}
      actions={<button type="button" onClick={() => openQuickLead?.(leadTypeFilter === 'business' ? 'business' : 'student')} className="dm-btn-primary text-sm"><Plus className="h-4 w-4" /> Add Lead</button>}
    >
      {followUps.overdue?.length > 0 && leadsPanel === 'followups' && (
        <div className="dm-card border-l-4 border-l-red-500 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-red-800">{followUps.overdue.length} overdue follow-up(s)</p>
            <button type="button" className="text-xs text-stone-500" onClick={() => setLeadsPanel('none')}>Close</button>
          </div>
          <FollowUpList overdue={followUps.overdue} upcoming={[]} onSelect={openLeadDetail} />
        </div>
      )}

      {leadsPanel === 'duplicates' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Duplicate phones</h3>
            <button type="button" className="text-xs text-stone-500" onClick={() => setLeadsPanel('none')}>Close</button>
          </div>
          {duplicates.length === 0 && <div className="dm-card p-6 text-center text-stone-400">No duplicates</div>}
          {duplicates.map((group) => (
            <div key={group.phone} className="dm-card p-4">
              <p className="mb-2 font-mono text-sm font-semibold text-orange">📞 {group.phone}</p>
              {group.leads.map((l) => (
                <div key={l.id} className="mb-1 flex items-center justify-between rounded-lg bg-stone-50 p-2 text-sm">
                  <span>{leadDisplayName(l)} · {l.leadId}</span>
                  <button type="button" onClick={() => openLeadDetail(l)} className="text-xs text-gold-dark">Open</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {['all', 'student', 'business'].map((t) => (
          <button key={t} type="button" onClick={() => setLeadTypeFilter(t)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${leadTypeFilter === t ? 'bg-orange text-white' : 'bg-stone-100 text-stone-600'}`}>
            {t === 'all' ? 'All' : t === 'student' ? 'Potential Students' : 'Potential Partners'}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-stone-200" />
        <button type="button" onClick={() => setLeadViewMode('list')} className={`rounded-full px-3 py-1.5 text-xs font-medium ${leadViewMode === 'list' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>List</button>
        <button type="button" onClick={() => setLeadViewMode('board')} className={`rounded-full px-3 py-1.5 text-xs font-medium ${leadViewMode === 'board' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>Board</button>
        {followUps.overdue?.length > 0 && (
          <button type="button" onClick={() => setLeadsPanel(leadsPanel === 'followups' ? 'none' : 'followups')} className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">
            {followUps.overdue.length} overdue
          </button>
        )}
        {duplicates.length > 0 && (
          <button type="button" onClick={() => setLeadsPanel(leadsPanel === 'duplicates' ? 'none' : 'duplicates')} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">
            {duplicates.length} duplicates
          </button>
        )}
      </div>

      {leadViewMode === 'board' ? (
        <LeadKanban
          leads={displayLeads}
          onOpenLead={openLeadDetail}
          onStatusChange={async (lead, status) => {
            await api.admin.updateLead(lead.id || lead._id, { status, note: 'Moved via pipeline board' });
            flash(`Moved to ${status}`);
            load();
          }}
        />
      ) : (
        <>
          <BulkActionBar selected={selectedLeads} onClear={() => setSelectedLeads([])} actions={[
            ...LEAD_STATUSES.slice(0, 4).map((s) => ({ label: `→ ${s.label}`, onClick: () => bulkLeads(s.value) })),
          ]} />
          <div className="flex flex-wrap items-end gap-3">
            <select className="dm-input w-auto" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)}>
              <option value="all">All Status</option>
              {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="dm-input w-auto" value={leadPriorityFilter || 'all'} onChange={(e) => setLeadPriorityFilter(e.target.value)}>
              <option value="all">All Priority</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <PartnerSelect
              value={leadPartnerFilter || 'all'}
              onChange={setLeadPartnerFilter}
              allowAll
              allLabel="All Partners"
              className="dm-input w-auto min-w-[200px]"
              showMeta={false}
              showReload={false}
              includeStatuses={['all']}
            />
            {staffUsers.length > 0 && (
              <select className="dm-input w-auto min-w-[160px]" value={leadAssigneeFilter || 'all'} onChange={(e) => setLeadAssigneeFilter(e.target.value)}>
                <option value="all">All Assignees</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            )}
            <div>
              <label className="dm-label text-xs">From</label>
              <input type="date" className="dm-input w-auto" value={leadDateFrom || ''} onChange={(e) => setLeadDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="dm-label text-xs">To</label>
              <input type="date" className="dm-input w-auto" value={leadDateTo || ''} onChange={(e) => setLeadDateTo(e.target.value)} />
            </div>
            <input className="dm-input min-w-[180px] flex-1" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" onClick={load} className="dm-btn-ghost"><Search className="h-4 w-4" /></button>
            <button type="button" onClick={() => openQuickLead?.(leadTypeFilter === 'business' ? 'business' : 'student')} className="dm-btn-primary"><Plus className="h-4 w-4" /> Add Lead</button>
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead>
                <tr>
                  <th><SelectCheckbox checked={selectedLeads.length === displayLeads.length && displayLeads.length > 0} onChange={() => toggleAll(displayLeads, selectedLeads, setSelectedLeads)} /></th>
                  <th>Lead ID</th><th>Type</th><th>Name / Contact</th><th>Partner</th><th>Status</th><th>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {displayLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-stone-400">No leads found. Use Add Lead or change filters.</td>
                  </tr>
                )}
                {displayLeads.map((lead) => (
                  <tr key={lead.id || lead._id} className="cursor-pointer" onClick={() => openLeadDetail(lead)}>
                    <td onClick={(e) => e.stopPropagation()}><SelectCheckbox checked={selectedLeads.includes(lead.id || lead._id)} onChange={() => setSelectedLeads((s) => { const id = lead.id || lead._id; return s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; })} /></td>
                    <td className="font-mono text-gold-dark">{lead.leadId}</td>
                    <td><span className={`dm-badge text-xs ${lead.leadType === 'business' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{leadLifecycleLabel(lead)}</span></td>
                    <td className="font-medium">{leadDisplayName(lead)}<br /><span className="text-xs text-stone-400">{leadDisplayPhone(lead)}</span></td>
                    <td>{lead.partner?.name || lead.partnerName}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td className="text-stone-400">{formatDate(lead.followUpDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardSection>
  );
}
