export default function StatCard({ icon: Icon, label, value, sub, accent = 'gold', trend }) {
  const accents = {
    gold: 'text-gold bg-amber-50',
    orange: 'text-orange bg-orange-50',
    green: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
  };
  return (
    <div className="dm-stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-stone-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
          {trend && <p className={`mt-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl p-2.5 ${accents[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
