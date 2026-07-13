import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api';
import AdminPageHeader from './AdminPageHeader';

const TYPE_COLORS = { follow_up: 'bg-amber-100 text-amber-800', task: 'bg-blue-100 text-blue-800', session: 'bg-purple-100 text-purple-800' };

export default function CalendarView({ onSelectLead, embedded = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const load = () => {
    setLoading(true);
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2, '0')}`;
    api.admin.calendar({ from, to })
      .then((d) => setEvents(d.events || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month]);

  const [y, m] = month.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsForDay = (day) => {
    const dateStr = `${month}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date?.startsWith(dateStr));
  };

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Calendar" subtitle={`${events.length} events this month — click an event to open lead`} onRefresh={load} />}

      <div className="flex items-center justify-center gap-2">
        <button type="button" className="dm-btn-ghost p-2" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></button>
        <span className="font-semibold text-stone-800 min-w-[160px] text-center flex items-center justify-center gap-2"><Calendar className="h-4 w-4" /> {monthLabel}</span>
        <button type="button" className="dm-btn-ghost p-2" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></button>
      </div>

      {loading ? (
        <div className="dm-card p-12 text-center text-stone-400">Loading calendar...</div>
      ) : (
        <div className="dm-card overflow-hidden">
          <div className="grid grid-cols-7 bg-stone-50 text-center text-xs font-semibold text-stone-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="p-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <div key={i} className={`min-h-[90px] border border-stone-100 p-1 ${day ? 'bg-white' : 'bg-stone-50/50'}`}>
                {day && (
                  <>
                    <span className="text-xs font-medium text-stone-600">{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {eventsForDay(day).slice(0, 3).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => e.leadId && onSelectLead?.({ id: e.leadId })}
                          className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${TYPE_COLORS[e.type] || 'bg-stone-100'}`}
                          title={e.title}
                        >
                          {e.title}
                        </button>
                      ))}
                      {eventsForDay(day).length > 3 && <span className="text-[10px] text-stone-400">+{eventsForDay(day).length - 3} more</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
