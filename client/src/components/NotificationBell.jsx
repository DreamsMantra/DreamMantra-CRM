import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, Users, ClipboardList, Copy } from 'lucide-react';

export default function NotificationBell({
  count = 0,
  items = [],
  onItemClick,
  onMarkAll,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const icons = {
    partners: Users,
    followups: AlertTriangle,
    duplicates: Copy,
    leads: ClipboardList,
    success: CheckCircle,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          count > 0
            ? 'bg-orange/10 text-orange hover:bg-orange/20'
            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
        }`}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-3.5 w-3.5" />
        {count > 0 ? <span>{count} new</span> : <span className="hidden sm:inline">Alerts</span>}
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-semibold text-stone-900">Needs attention</p>
            {onMarkAll && count > 0 && (
              <button type="button" className="text-xs font-medium text-gold-dark hover:underline" onClick={() => { onMarkAll(); setOpen(false); }}>
                View partners
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="p-6 text-center text-sm text-stone-400">You're all caught up.</p>
            )}
            {items.map((item) => {
              const Icon = icons[item.type] || Bell;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-start gap-3 border-b border-stone-50 px-4 py-3 text-left transition hover:bg-stone-50"
                  onClick={() => {
                    onItemClick?.(item);
                    setOpen(false);
                  }}
                >
                  <span className={`mt-0.5 rounded-lg p-2 ${item.tone || 'bg-amber-50 text-amber-700'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-stone-900">{item.title}</span>
                    {item.desc && <span className="mt-0.5 block text-xs text-stone-500">{item.desc}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-gold-dark">Open →</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
