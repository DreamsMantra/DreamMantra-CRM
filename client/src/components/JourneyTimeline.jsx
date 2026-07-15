import { LEAD_STATUSES, formatDate } from '../utils/constants';
import { leadLifecycleLabel } from '../config/adminTabs';

function statusLabel(value) {
  return LEAD_STATUSES.find((s) => s.value === value)?.label || String(value || '').replace(/_/g, ' ');
}

/**
 * Journey tracking — status pipeline + chronological history for a lead
 * (potential student / potential partner → converted student / partner).
 */
export default function JourneyTimeline({ lead, compact = false }) {
  if (!lead) return null;
  const history = [...(lead.statusHistory || [])].sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );
  const current = lead.status || 'new';
  const pipeline = LEAD_STATUSES.filter((s) => !['on_hold', 'counselling_scheduled', 'assessment_done', 'converted'].includes(s.value));
  const currentIdx = pipeline.findIndex((s) => s.value === current);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="dm-badge text-xs">{leadLifecycleLabel(lead)}</span>
        <span className="text-xs text-stone-500">Lead ID <code className="font-mono font-semibold">{lead.leadId}</code></span>
        {lead.project && <span className="text-xs text-orange">Project: {lead.project}</span>}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-1">
          {pipeline.map((s, i) => {
            const done = currentIdx >= 0 && i <= currentIdx && current !== 'lost';
            const isCurrent = s.value === current;
            const lost = current === 'lost' && s.value === 'lost';
            return (
              <span
                key={s.value}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isCurrent || lost ? 'bg-orange text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-400'
                }`}
              >
                {s.label}
              </span>
            );
          })}
        </div>
      )}

      <div className="relative space-y-0 border-l-2 border-stone-200 pl-4">
        {history.length === 0 && (
          <p className="py-2 text-xs text-stone-400">No journey events yet — status changes appear here.</p>
        )}
        {history.map((h, i) => (
          <div key={`${h.createdAt}-${i}`} className="relative pb-4">
            <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-white" />
            <p className="text-sm font-semibold text-stone-800">{statusLabel(h.status)}</p>
            <p className="text-xs text-stone-500">
              {formatDate(h.createdAt)}
              {h.updatedByName ? ` · ${h.updatedByName}` : ''}
            </p>
            {h.note && <p className="mt-0.5 text-xs text-stone-600">{h.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
