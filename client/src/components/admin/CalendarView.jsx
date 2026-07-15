import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import AdminPageHeader from './AdminPageHeader';
import Modal from '../Modal';

const TYPE_COLORS = {
  follow_up: 'bg-amber-100 text-amber-800',
  task: 'bg-blue-100 text-blue-800',
  session: 'bg-purple-100 text-purple-800',
  note: 'bg-emerald-100 text-emerald-800',
};

const TYPE_LABELS = { follow_up: 'Follow-up', task: 'Task', session: 'Session', note: 'Note' };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarView({ onSelectLead, embedded = false, leads = [] }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ type: 'task', title: '', date: todayStr(), leadId: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const load = async () => {
    setLoading(true);
    setError('');
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2, '0')}`;
    try {
      const d = await api.admin.calendar({ from, to });
      setEvents(d.events || []);
    } catch (err) {
      setError(err.message || 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const [y, m] = month.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const filteredEvents = useMemo(
    () => (typeFilter === 'all' ? events : events.filter((e) => e.type === typeFilter)),
    [events, typeFilter]
  );

  const eventsForDay = (day) => {
    const dateStr = `${month}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter((e) => String(e.date || '').slice(0, 10) === dateStr);
  };

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  };

  const goToday = () => {
    const t = todayStr();
    setMonth(t.slice(0, 7));
    setSelectedDay(Number(t.slice(8, 10)));
  };

  const openCreate = (day) => {
    const date = day ? `${month}-${String(day).padStart(2, '0')}` : todayStr();
    setForm({ type: 'task', title: '', date, leadId: '', notes: '' });
    setCreateOpen(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    setError('');
    try {
      await api.admin.createCalendarEvent(form);
      setCreateOpen(false);
      await load();
      if (form.date.startsWith(month)) setSelectedDay(Number(form.date.slice(8, 10)));
    } catch (err) {
      setError(err.message || 'Could not create event');
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const today = todayStr();
  const dayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      {!embedded && (
        <AdminPageHeader title="Calendar" subtitle={`${filteredEvents.length} events this month`} onRefresh={load} />
      )}
      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-stone-500">{filteredEvents.length} events · click a day for details</p>
          <div className="flex gap-2">
            <button type="button" className="dm-btn-ghost text-xs" onClick={load}><RefreshCw className="mr-1 inline h-3 w-3" /> Refresh</button>
            <button type="button" className="dm-btn-primary text-xs" onClick={() => openCreate(selectedDay)}><Plus className="mr-1 inline h-3 w-3" /> Add event</button>
          </div>
        </div>
      )}

      {error && <div className="dm-alert-error text-sm">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="dm-btn-ghost p-2" onClick={prevMonth} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <span className="flex min-w-[180px] items-center justify-center gap-2 font-semibold text-stone-800">
            <Calendar className="h-4 w-4" /> {monthLabel}
          </span>
          <button type="button" className="dm-btn-ghost p-2" onClick={nextMonth} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
          <button type="button" className="dm-btn-ghost text-xs" onClick={goToday}>Today</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {['all', 'follow_up', 'task', 'session', 'note'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${typeFilter === t ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {t === 'all' ? 'All' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {!embedded && (
          <button type="button" className="dm-btn-primary text-sm" onClick={() => openCreate(selectedDay)}>
            <Plus className="mr-1 inline h-4 w-4" /> Add event
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="dm-card p-12 text-center text-stone-400">Loading calendar...</div>
          ) : (
            <div className="dm-card overflow-hidden">
              <div className="grid grid-cols-7 bg-stone-50 text-center text-xs font-semibold text-stone-500">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="p-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const dateStr = day ? `${month}-${String(day).padStart(2, '0')}` : '';
                  const isToday = dateStr === today;
                  const isSelected = day === selectedDay;
                  const dayEv = day ? eventsForDay(day) : [];
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!day}
                      onClick={() => day && setSelectedDay(day)}
                      className={`min-h-[96px] border border-stone-100 p-1 text-left transition ${
                        !day ? 'bg-stone-50/50' : isSelected ? 'bg-orange/5 ring-2 ring-inset ring-orange/40' : 'bg-white hover:bg-stone-50'
                      }`}
                    >
                      {day && (
                        <>
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isToday ? 'bg-orange text-white' : 'text-stone-600'
                          }`}>{day}</span>
                          <div className="mt-1 space-y-0.5">
                            {dayEv.slice(0, 3).map((ev) => (
                              <span
                                key={ev.id}
                                className={`block truncate rounded px-1 py-0.5 text-[10px] ${TYPE_COLORS[ev.type] || 'bg-stone-100'}`}
                                title={ev.title}
                              >
                                {ev.title}
                              </span>
                            ))}
                            {dayEv.length > 3 && <span className="text-[10px] text-stone-400">+{dayEv.length - 3} more</span>}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="dm-card flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">
              {selectedDay ? `${month}-${String(selectedDay).padStart(2, '0')}` : 'Select a day'}
            </h3>
            {selectedDay && (
              <button type="button" className="text-xs font-semibold text-orange" onClick={() => openCreate(selectedDay)}>+ Add</button>
            )}
          </div>
          {!selectedDay && <p className="text-sm text-stone-400">Click any date to view follow-ups, tasks and sessions.</p>}
          {selectedDay && dayEvents.length === 0 && (
            <p className="text-sm text-stone-400">No events. Add a follow-up or task for this day.</p>
          )}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {dayEvents.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-stone-100 p-3">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[ev.type] || 'bg-stone-100'}`}>
                  {TYPE_LABELS[ev.type] || ev.type}
                </span>
                <p className="mt-1 text-sm font-medium text-stone-900">{ev.title}</p>
                {ev.leadId && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-gold-dark hover:underline"
                    onClick={() => onSelectLead?.({ id: ev.leadId })}
                  >
                    Open lead →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add calendar event">
        <form onSubmit={saveEvent} className="space-y-4">
          <div>
            <label className="dm-label">Type</label>
            <select className="dm-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="task">Task</option>
              <option value="follow_up">Lead follow-up</option>
              <option value="note">Note / reminder</option>
            </select>
          </div>
          <div>
            <label className="dm-label">Title *</label>
            <input className="dm-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Call partner / review leads" />
          </div>
          <div>
            <label className="dm-label">Date *</label>
            <input type="date" className="dm-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          {form.type === 'follow_up' && (
            <div>
              <label className="dm-label">Lead *</label>
              <select className="dm-input" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} required>
                <option value="">Select lead</option>
                {leads.map((l) => (
                  <option key={l.id || l._id} value={l.id || l._id}>
                    {l.leadId || ''} — {l.studentName || l.companyName || 'Lead'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="dm-label">Notes</label>
            <textarea className="dm-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="dm-btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Create event'}</button>
        </form>
      </Modal>
    </div>
  );
}
