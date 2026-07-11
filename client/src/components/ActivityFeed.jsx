import { formatDate } from '../utils/constants';
import { Activity, UserPlus, ClipboardList, IndianRupee, Megaphone } from 'lucide-react';

const icons = {
  lead_created: ClipboardList,
  lead_updated: ClipboardList,
  bulk_import: ClipboardList,
  partner_created: UserPlus,
  commission_paid: IndianRupee,
  announcement: Megaphone,
};

export default function ActivityFeed({ activities = [], limit = 20 }) {
  const items = activities.slice(0, limit);
  if (!items.length) return <p className="py-6 text-center text-sm text-stone-400">No recent activity</p>;

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const Icon = icons[a.action] || Activity;
        return (
          <div key={a.id} className="flex gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gold shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-stone-800">
                <span className="font-semibold">{a.userName}</span>{' '}
                <span className="text-stone-500">{a.action.replace(/_/g, ' ')}</span>
                {a.details && <span className="text-stone-600"> — {a.details}</span>}
              </p>
              <p className="text-xs text-stone-400">{formatDate(a.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
