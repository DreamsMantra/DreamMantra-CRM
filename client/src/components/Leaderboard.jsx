import { Trophy, Medal } from 'lucide-react';
import { partnerTypeLabel } from '../utils/constants';

const tierColors = {
  platinum: 'text-purple-600 bg-purple-50',
  gold: 'text-amber-700 bg-amber-50',
  silver: 'text-stone-600 bg-stone-100',
  bronze: 'text-orange-700 bg-orange-50',
};

export default function Leaderboard({ items = [], highlightId }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-stone-400">No data yet</p>;

  return (
    <div className="space-y-2">
      {items.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
            p.id === highlightId ? 'border-orange/40 bg-orange/5' : 'border-stone-100 bg-white'
          }`}
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? 'bg-gold/20 text-gold-dark' : 'bg-stone-100 text-stone-500'}`}>
            {i < 3 ? <Trophy className="h-4 w-4" /> : i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-stone-900">{p.name}</p>
            <p className="text-xs text-stone-500">{partnerTypeLabel(p.partnerType)} · {p.organization || '—'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-emerald-600">{p.convertedLeads} <span className="text-xs font-normal text-stone-400">conv.</span></p>
            <p className="text-xs text-stone-400">{p.conversionRate}% rate</p>
          </div>
          {p.tier && (
            <span className={`dm-badge capitalize ${tierColors[p.tier] || tierColors.bronze}`}>{p.tier}</span>
          )}
        </div>
      ))}
    </div>
  );
}
