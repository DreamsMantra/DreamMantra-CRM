import { useEffect, useState } from 'react';
import {
  FileText, Download, Trash2, Edit2, Save, Database,
  ClipboardList, Users, MessageSquare, Bell, Activity, RefreshCw, Plus,
} from 'lucide-react';
import BulkLeadImport from '../BulkLeadImport';
import PartnerSelect from '../PartnerSelect';
import { api } from '../../api';
import ExportButton from '../ExportButton';
import Modal from '../Modal';
import { PARTNER_TYPES, INDIAN_STATES, formatDate, partnerTypeLabel } from '../../utils/constants';

const FORM_NAMES = [];

const FIELD_TYPES = ['text', 'email', 'tel', 'password', 'number', 'date', 'select', 'textarea', 'checkbox', 'multiselect'];

export default function MasterControl({ token, onRefresh, flash, fail, partners = [], leads = [], onOpenLead }) {
  const [section, setSection] = useState('forms');
  const [templates, setTemplates] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [activeForm, setActiveForm] = useState('registration');
  const [savingForms, setSavingForms] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [bulkPartner, setBulkPartner] = useState('');

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
      setCatalog(forms.catalog || []);
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
      setCatalog(res.catalog || catalog);
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

  const deleteField = (formId, idx) => {
    const fields = [...(templates[formId] || [])];
    fields.splice(idx, 1);
    setTemplates({ ...templates, [formId]: fields });
  };

  const addField = () => {
    const key = `field_${Date.now().toString(36).slice(-6)}`;
    const fields = [...(templates[activeForm] || []), { key, label: 'New Field', type: 'text', required: false, enabled: true }];
    setTemplates({ ...templates, [activeForm]: fields });
  };

  const createForm = async () => {
    if (!newFormName.trim()) return;
    try {
      const res = await api.admin.createCustomForm({ name: newFormName, description: '' });
      setTemplates(res.templates);
      setCatalog(res.catalog);
      setActiveForm(res.form.id);
      setNewFormName('');
      setShowNewForm(false);
      flash(`Form "${res.form.name}" created`);
    } catch (err) { fail(err); }
  };

  const removeForm = async (formId) => {
    const item = catalog.find((c) => c.id === formId);
    if (item?.builtin) { fail(new Error('Built-in forms cannot be deleted')); return; }
    if (!confirm(`Delete form "${item?.label}"?`)) return;
    const res = await api.admin.deleteCustomForm(formId);
    setTemplates(res.templates);
    setCatalog(res.catalog);
    setActiveForm('registration');
    flash('Form deleted');
  };

  const sections = [
    { id: 'forms', label: 'Form Builder', icon: FileText },
    { id: 'leads', label: 'Bulk Leads', icon: ClipboardList },
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
            {catalog.map((f) => (
              <div key={f.id} className={`rounded-xl border transition ${activeForm === f.id ? 'border-orange bg-orange/5' : 'border-stone-200'}`}>
                <button type="button" onClick={() => setActiveForm(f.id)} className="w-full p-4 text-left">
                  <p className="font-semibold text-stone-900">{f.label || f.name}</p>
                  <p className="mt-1 text-xs text-stone-500">{f.description}</p>
                  {f.builtin && <span className="mt-1 inline-block text-[10px] font-bold uppercase text-gold-dark">Built-in</span>}
                </button>
                {!f.builtin && activeForm === f.id && (
                  <button type="button" onClick={() => removeForm(f.id)} className="w-full border-t border-red-100 py-2 text-xs text-red-600 hover:bg-red-50">Delete Form</button>
                )}
              </div>
            ))}
            {showNewForm ? (
              <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 space-y-2">
                <input className="dm-input text-sm" placeholder="Form name" value={newFormName} onChange={(e) => setNewFormName(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={createForm} className="dm-btn-primary flex-1 text-xs py-2">Create</button>
                  <button type="button" onClick={() => setShowNewForm(false)} className="dm-btn-ghost text-xs py-2">Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowNewForm(true)} className="dm-btn-gold w-full text-sm"><Plus className="h-4 w-4" /> New Form</button>
            )}
          </div>
          <div className="lg:col-span-3 dm-card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-stone-900">
                Edit Fields — {catalog.find((f) => f.id === activeForm)?.label || activeForm}
              </h3>
              <div className="flex gap-2">
                <button type="button" onClick={addField} className="dm-btn-ghost text-sm"><Plus className="h-4 w-4" /> Add Field</button>
                <button type="button" onClick={saveForms} disabled={savingForms} className="dm-btn-primary text-sm"><Save className="h-4 w-4" /> Save Forms</button>
              </div>
            </div>
            <p className="mb-4 text-sm text-stone-500">Add, edit, delete fields. Toggle on/off, rename labels, change type. Click Save to apply live.</p>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {(templates[activeForm] || []).length === 0 && (
                <p className="py-8 text-center text-stone-400">No fields yet — click Add Field</p>
              )}
              {(templates[activeForm] || []).map((field, idx) => (
                <div key={`${field.key}-${idx}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <label className="flex items-center gap-2" title="Enabled">
                    <input type="checkbox" checked={field.enabled !== false} onChange={(e) => updateField(activeForm, idx, { enabled: e.target.checked })} />
                  </label>
                  <input className="dm-input w-28 py-1.5 font-mono text-xs" value={field.key} onChange={(e) => updateField(activeForm, idx, { key: e.target.value.replace(/\s/g, '_') })} placeholder="key" />
                  <input className="dm-input min-w-[120px] flex-1 py-1.5 text-sm" value={field.label} onChange={(e) => updateField(activeForm, idx, { label: e.target.value })} placeholder="Label" />
                  <select className="dm-input w-auto py-1.5 text-xs" value={field.type || 'text'} onChange={(e) => updateField(activeForm, idx, { type: e.target.value })}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input type="checkbox" checked={!!field.required} onChange={(e) => updateField(activeForm, idx, { required: e.target.checked })} />
                    Req.
                  </label>
                  <button type="button" onClick={() => deleteField(activeForm, idx)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete field"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'leads' && (
        <div className="space-y-6">
          <div className="dm-card p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-stone-900">Bulk Import Leads</h3>
            <PartnerSelect
              value={bulkPartner}
              onChange={setBulkPartner}
              placeholder="Select partner for bulk import"
              className="dm-input mb-1 max-w-md"
            />
            <BulkLeadImport onImport={async (leadsData) => {
              if (!bulkPartner) { fail(new Error('Select a partner first')); return; }
              const res = await api.admin.bulkLeads(bulkPartner, leadsData);
              flash(`Imported ${res.created} leads`);
              onRefresh?.();
            }} />
          </div>
          <div className="dm-card overflow-x-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-stone-900">Manage Existing Leads ({leads.length})</h3>
              <ExportButton href={api.admin.exportLeads()} token={token} label="Download All" />
            </div>
            <table className="dm-table w-full">
              <thead><tr><th>Dreamz ID</th><th>Student</th><th>Phone</th><th>Partner</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {leads.slice(0, 50).map((l) => (
                  <tr key={l.id || l._id}>
                    <td className="font-mono text-gold-dark">{l.leadId}</td>
                    <td>{l.studentName}</td>
                    <td>{l.studentPhone}</td>
                    <td>{l.partnerName || l.partner?.name}</td>
                    <td className="capitalize">{l.status}</td>
                    <td className="space-x-2">
                      <button type="button" onClick={() => onOpenLead?.(l)} className="text-gold-dark text-xs font-semibold">Edit</button>
                      <button type="button" onClick={async () => { if (confirm('Delete lead?')) { await api.admin.deleteLead(l.id || l._id); flash('Deleted'); onRefresh?.(); } }} className="text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length > 50 && <p className="mt-2 text-center text-xs text-stone-400">Showing 50 of {leads.length} — use All Leads tab for full list</p>}
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
