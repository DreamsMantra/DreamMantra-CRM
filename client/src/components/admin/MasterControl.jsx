import { useEffect, useState } from 'react';
import {
  FileText, Download, Trash2, Edit2, Save, RotateCcw, Database,
  ClipboardList, Users, MessageSquare, Bell, Activity, RefreshCw,
} from 'lucide-react';
import { api } from '../../api';
import ExportButton from '../ExportButton';
import Modal from '../Modal';
import { PARTNER_TYPES, INDIAN_STATES, formatDate, partnerTypeLabel } from '../../utils/constants';

const FORM_NAMES = [
  { id: 'registration', label: 'Registration Form', desc: 'Partner signup / franchise application' },
  { id: 'lead', label: 'Lead Submission Form', desc: 'Student lead details form' },
  { id: 'partnerProfile', label: 'Partner Profile Form', desc: 'Partner profile & payout fields' },
];

export default function MasterControl({ token, onRefresh, flash, fail }) {
  const [section, setSection] = useState('forms');
  const [templates, setTemplates] = useState({});
  const [activeForm, setActiveForm] = useState('registration');
  const [savingForms, setSavingForms] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [regFilter, setRegFilter] = useState('all');
  const [editReg, setEditReg] = useState(null);

  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [editComment, setEditComment] = useState(null);

  const load = async () => {
    try {
      const [forms, regs, comms, notifs] = await Promise.all([
        api.admin.getForms(),
        api.admin.registrations(regFilter),
        api.admin.allComments(),
        api.admin.allNotifications(),
      ]);
      setTemplates(forms.templates || {});
      setRegistrations(regs.registrations || []);
      setComments(comms.comments || []);
      setNotifications(notifs.notifications || []);
    } catch (err) {
      fail(err);
    }
  };

  useEffect(() => { load(); }, [regFilter]);

  const saveForms = async () => {
    setSavingForms(true);
    try {
      const res = await api.admin.updateForms(templates);
      setTemplates(res.templates);
      flash('Form templates saved — live on registration & lead forms');
    } catch (err) {
      fail(err);
    } finally {
      setSavingForms(false);
    }
  };

  const updateField = (formId, idx, patch) => {
    const fields = [...(templates[formId] || [])];
    fields[idx] = { ...fields[idx], ...patch };
    setTemplates({ ...templates, [formId]: fields });
  };

  const sections = [
    { id: 'forms', label: 'Form Builder', icon: FileText },
    { id: 'registrations', label: 'Registrations', icon: Users },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'downloads', label: 'Download All', icon: Download },
  ];

  return (
    <div className="space-y-6">
      <div className="dm-card flex flex-wrap gap-2 p-3">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${section === s.id ? 'bg-orange text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
          >
            <s.icon className="h-4 w-4" /> {s.label}
          </button>
        ))}
        <button type="button" onClick={load} className="dm-btn-ghost ml-auto text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {section === 'forms' && (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-1">
            {FORM_NAMES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveForm(f.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${activeForm === f.id ? 'border-orange bg-orange/5' : 'border-stone-200 hover:border-gold/40'}`}
              >
                <p className="font-semibold text-stone-900">{f.label}</p>
                <p className="mt-1 text-xs text-stone-500">{f.desc}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-3 dm-card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-stone-900">Edit Fields — {FORM_NAMES.find((f) => f.id === activeForm)?.label}</h3>
              <button type="button" onClick={saveForms} disabled={savingForms} className="dm-btn-primary text-sm"><Save className="h-4 w-4" /> Save Forms</button>
            </div>
            <p className="mb-4 text-sm text-stone-500">Toggle fields on/off, rename labels, mark required. Changes apply to live forms after save.</p>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {(templates[activeForm] || []).map((field, idx) => (
                <div key={field.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={field.enabled !== false} onChange={(e) => updateField(activeForm, idx, { enabled: e.target.checked })} />
                    <span className="font-mono text-xs text-stone-400">{field.key}</span>
                  </label>
                  <input className="dm-input min-w-[140px] flex-1 py-1.5 text-sm" value={field.label} onChange={(e) => updateField(activeForm, idx, { label: e.target.value })} />
                  <label className="flex items-center gap-1 text-xs text-stone-600">
                    <input type="checkbox" checked={!!field.required} onChange={(e) => updateField(activeForm, idx, { required: e.target.checked })} />
                    Required
                  </label>
                  <span className="text-xs capitalize text-stone-400">{field.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'registrations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select className="dm-input w-auto" value={regFilter} onChange={(e) => setRegFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
            <ExportButton href={api.admin.exportRegistrations(regFilter)} token={token} label="Download CSV" />
          </div>
          <div className="dm-card overflow-x-auto">
            <table className="dm-table w-full">
              <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th>City</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.name}</td>
                    <td>{r.email}</td>
                    <td>{partnerTypeLabel(r.partnerType)}</td>
                    <td className="capitalize">{r.status}</td>
                    <td>{r.city || '—'}</td>
                    <td className="text-stone-400">{formatDate(r.createdAt)}</td>
                    <td className="space-x-2">
                      <button type="button" onClick={() => setEditReg({ ...r })} className="text-gold-dark"><Edit2 className="h-4 w-4 inline" /></button>
                      <button type="button" onClick={async () => { if (confirm(`Delete registration for ${r.name}?`)) { await api.admin.deleteRegistration(r.id); flash('Deleted'); load(); onRefresh?.(); } }} className="text-red-600"><Trash2 className="h-4 w-4 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'comments' && (
        <div className="dm-card overflow-x-auto">
          <table className="dm-table w-full">
            <thead><tr><th>Lead</th><th>User</th><th>Message</th><th>Internal</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs text-gold-dark">{c.lead?.leadId} — {c.lead?.studentName}</td>
                  <td>{c.userName}</td>
                  <td className="max-w-xs truncate">{c.message}</td>
                  <td>{c.isInternal ? 'Yes' : 'No'}</td>
                  <td className="text-stone-400">{formatDate(c.createdAt)}</td>
                  <td className="space-x-2">
                    <button type="button" onClick={() => setEditComment({ ...c })} className="text-gold-dark"><Edit2 className="h-4 w-4 inline" /></button>
                    <button type="button" onClick={async () => { if (confirm('Delete comment?')) { await api.admin.deleteComment(c.id); load(); } }} className="text-red-600"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === 'notifications' && (
        <div className="dm-card overflow-x-auto">
          <table className="dm-table w-full">
            <thead><tr><th>To</th><th>Title</th><th>Message</th><th>Read</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td>{n.userName}</td>
                  <td className="font-semibold">{n.title}</td>
                  <td className="max-w-xs truncate">{n.message}</td>
                  <td>{n.read ? '✓' : '—'}</td>
                  <td className="text-stone-400">{formatDate(n.createdAt)}</td>
                  <td>
                    <button type="button" onClick={async () => { if (confirm('Delete notification?')) { await api.admin.deleteNotification(n.id); load(); } }} className="text-red-600"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === 'downloads' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: api.admin.exportLeads(), label: 'All Leads', icon: ClipboardList },
            { href: api.admin.exportPartners(), label: 'All Partners', icon: Users },
            { href: api.admin.exportCommissions(), label: 'Commissions', icon: Database },
            { href: api.admin.exportRegistrations('all'), label: 'Registrations', icon: Users },
            { href: api.admin.exportActivities(), label: 'Activity Log', icon: Activity },
            { href: api.admin.exportAnnouncements(), label: 'Announcements', icon: FileText },
            { href: api.admin.exportBackup(), label: 'Full CRM Backup (JSON)', icon: Download },
          ].map((item) => (
            <div key={item.label} className="dm-card flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-gold-dark" />
                <span className="font-semibold text-stone-900">{item.label}</span>
              </div>
              <ExportButton href={item.href} token={token} label="Download" />
            </div>
          ))}
          <div className="dm-card border-red-200 bg-red-50/50 p-5 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-900">Clear Activity Log</p>
                <p className="text-sm text-stone-500">Permanently delete all activity history</p>
              </div>
              <button type="button" onClick={async () => { if (confirm('Clear entire activity log?')) { await api.admin.clearActivities(); flash('Activity log cleared'); onRefresh?.(); } }} className="dm-btn-danger">Clear Log</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!editReg} onClose={() => setEditReg(null)} title="Edit Registration" wide>
        {editReg && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            await api.admin.updateRegistration(editReg.id, editReg);
            flash('Registration updated');
            setEditReg(null);
            load();
            onRefresh?.();
          }} className="grid gap-4 sm:grid-cols-2">
            {['name', 'email', 'phone', 'organization', 'city', 'address'].map((f) => (
              <div key={f}><label className="dm-label capitalize">{f}</label><input className="dm-input" value={editReg[f] || ''} onChange={(e) => setEditReg({ ...editReg, [f]: e.target.value })} required={['name', 'email'].includes(f)} /></div>
            ))}
            <div><label className="dm-label">State</label><select className="dm-input" value={editReg.state || ''} onChange={(e) => setEditReg({ ...editReg, state: e.target.value })}>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="dm-label">Partner Type</label><select className="dm-input" value={editReg.partnerType} onChange={(e) => setEditReg({ ...editReg, partnerType: e.target.value })}>{PARTNER_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            <div><label className="dm-label">Status</label><select className="dm-input" value={editReg.status} onChange={(e) => setEditReg({ ...editReg, status: e.target.value })}>{['pending', 'active', 'suspended', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="dm-label">Admin Notes</label><textarea className="dm-input" value={editReg.notes || ''} onChange={(e) => setEditReg({ ...editReg, notes: e.target.value })} /></div>
            <div className="sm:col-span-2"><button type="submit" className="dm-btn-primary w-full">Save Registration</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!editComment} onClose={() => setEditComment(null)} title="Edit Comment">
        {editComment && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            await api.admin.updateComment(editComment.id, { message: editComment.message, isInternal: editComment.isInternal });
            flash('Comment updated');
            setEditComment(null);
            load();
          }} className="space-y-4">
            <textarea className="dm-input min-h-[100px]" value={editComment.message} onChange={(e) => setEditComment({ ...editComment, message: e.target.value })} required />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editComment.isInternal} onChange={(e) => setEditComment({ ...editComment, isInternal: e.target.checked })} /> Internal only</label>
            <button type="submit" className="dm-btn-primary w-full">Save Comment</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
