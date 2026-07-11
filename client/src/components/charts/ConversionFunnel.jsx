import { statusMeta } from '../../utils/constants';

export default function ConversionFunnel({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.filter((d) => d.count > 0 || d.status === 'new').map((d) => {
        const meta = statusMeta(d.status);
        return (
          <div key={d.status} className="dm-funnel-step">
            <div className="flex items-center gap-3">
              <span className={`dm-badge ${meta.color}`}>{meta.label}</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-stone-100 sm:w-48">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold to-orange transition-all"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-display text-lg font-bold text-stone-800">{d.count}</span>
          </div>
        );
      })}
    </div>
  );
}
