/** Visible sub-tab bar — high contrast active state */
export default function AdminSubTabs({ tabs, active, onChange }) {
  if (!tabs?.length) return null;
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            active === t.id
              ? 'bg-gold text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-600 hover:border-gold/40 hover:text-stone-900'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
