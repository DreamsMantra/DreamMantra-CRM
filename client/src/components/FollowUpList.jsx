import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate } from '../utils/constants';

export default function FollowUpList({ overdue = [], upcoming = [], onSelect }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-600">
          <AlertTriangle className="h-4 w-4" /> Overdue ({overdue.length})
        </h3>
        <div className="space-y-2">
          {overdue.length === 0 && <p className="text-sm text-stone-400">No overdue follow-ups</p>}
          {overdue.map((l) => (
            <button key={l.id} type="button" onClick={() => onSelect?.(l)} className="w-full rounded-xl border border-red-100 bg-red-50/50 p-3 text-left transition hover:border-red-200">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-stone-900">{l.studentName}</span>
                {l.kind === 'activity' ? (
                  <span className="dm-badge text-[10px] capitalize">{l.type || 'activity'}</span>
                ) : (
                  <StatusBadge status={l.status} />
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {l.kind === 'activity' ? `Activity · ${l.createdByName || 'Staff'}` : l.leadId}
                {' · '}Due {formatDate(l.followUpDate)}
              </p>
              {l.kind === 'activity' && l.comment && (
                <p className="mt-1 line-clamp-2 text-xs text-stone-600">{l.comment}</p>
              )}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-600">
          <Clock className="h-4 w-4" /> Upcoming 7 days ({upcoming.length})
        </h3>
        <div className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-stone-400">No upcoming follow-ups</p>}
          {upcoming.map((l) => (
            <button key={l.id} type="button" onClick={() => onSelect?.(l)} className="w-full rounded-xl border border-stone-100 bg-white p-3 text-left transition hover:border-gold/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-stone-900">{l.studentName}</span>
                {l.kind === 'activity' ? (
                  <span className="dm-badge text-[10px] capitalize">{l.type || 'activity'}</span>
                ) : (
                  <StatusBadge status={l.status} />
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                <Calendar className="h-3 w-3" /> {formatDate(l.followUpDate)} · {l.partnerName || '—'}
                {l.kind === 'activity' ? ` · ${l.createdByName || 'Staff'}` : ''}
              </p>
              {l.kind === 'activity' && l.comment && (
                <p className="mt-1 line-clamp-2 text-xs text-stone-600">{l.comment}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
