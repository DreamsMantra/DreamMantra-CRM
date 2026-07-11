import { Megaphone, X } from 'lucide-react';
import { useState } from 'react';

export default function AnnouncementBanner({ announcements = [] }) {
  const [dismissed, setDismissed] = useState(() => new Set(JSON.parse(localStorage.getItem('dismissed_announcements') || '[]')));
  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (!visible.length) return null;

  const dismiss = (id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
  };

  return (
    <div className="mb-4 space-y-2">
      {visible.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div className="flex-1">
            <p className="font-semibold text-stone-900">{a.title}</p>
            <p className="text-sm text-stone-600">{a.message}</p>
          </div>
          <button type="button" onClick={() => dismiss(a.id)} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
