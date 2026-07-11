export default function BarChart({ data, valueKey = 'total', labelKey = 'label', color = 'gold' }) {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  const colors = { gold: 'from-gold to-gold-light', orange: 'from-orange to-orange-hover', green: 'from-emerald-500 to-emerald-400' };

  return (
    <div className="flex h-48 items-end justify-between gap-2 pt-4">
      {data.map((d) => (
        <div key={d[labelKey]} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-semibold text-stone-600">{d[valueKey]}</span>
          <div
            className={`dm-chart-bar w-full bg-gradient-to-t ${colors[color]}`}
            style={{ height: `${Math.max(8, (d[valueKey] / max) * 100)}%` }}
            title={`${d[labelKey]}: ${d[valueKey]}`}
          />
          <span className="text-[10px] font-medium text-stone-500">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}
