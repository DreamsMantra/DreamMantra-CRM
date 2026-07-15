import { useEffect, useState } from 'react';
import { Link2, Trash2 } from 'lucide-react';
import { api } from '../../api';
import PartnerSelect from '../PartnerSelect';
import AdminPageHeader from './AdminPageHeader';

const CATEGORIES = [
  { value: 'training', label: 'Training' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'product', label: 'Product' },
];

const emptyForm = {
  partnerId: 'all',
  category: 'training',
  title: '',
  type: 'link',
  url: '',
};

export default function PartnerResourcesAdmin({
  embedded = false,
  initialPartnerId = 'all',
  onClose,
}) {
  const [resources, setResources] = useState([]);
  const [partners, setPartners] = useState([]);
  const [filterPartner, setFilterPartner] = useState(initialPartnerId || 'all');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState({ ...emptyForm, partnerId: initialPartnerId || 'all' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const load = async () => {
    setError('');
    try {
      const params = {};
      // Omit partnerId when "all" so the list includes every resource (global + per-partner)
      if (filterPartner && filterPartner !== 'all') params.partnerId = filterPartner;
      if (filterCategory) params.category = filterCategory;
      const [resRes, partnersRes] = await Promise.all([
        api.admin.partnerResources(params),
        api.admin.partners({ status: 'all' }),
      ]);
      setResources(resRes.resources || []);
      setPartners(partnersRes.partners || []);
    } catch (err) {
      setError(err.message || 'Failed to load resources');
    }
  };

  useEffect(() => { load(); }, [filterPartner, filterCategory]);

  useEffect(() => {
    if (initialPartnerId) {
      setFilterPartner(initialPartnerId);
      setForm((f) => ({ ...f, partnerId: initialPartnerId }));
    }
  }, [initialPartnerId]);

  const partnerLabel = (id) => {
    if (!id || id === 'all') return 'All partners';
    return partners.find((p) => p.id === id)?.name || id;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      setError('Title and URL are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.admin.createPartnerResource({
        partnerId: form.partnerId || 'all',
        category: form.category,
        title: form.title.trim(),
        type: form.type || 'link',
        url: form.url.trim(),
      });
      setForm({ ...emptyForm, partnerId: form.partnerId || 'all', category: form.category });
      flash('Resource added');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await api.admin.deletePartnerResource(id);
      flash('Resource deleted');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <AdminPageHeader title="Partner Resources" subtitle="Training, marketing, and product links for partners" onRefresh={load} />
      )}
      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="dm-section-title">Partner Resources</h3>
          <div className="flex gap-2">
            <button type="button" className="dm-btn-ghost text-sm" onClick={load}>Refresh</button>
            {onClose && <button type="button" className="dm-btn-ghost text-sm" onClick={onClose}>Close</button>}
          </div>
        </div>
      )}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {error && <div className="dm-alert-error text-sm">{error}</div>}

      <form onSubmit={submit} className="dm-card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="dm-label">Partner</label>
          <PartnerSelect
            value={form.partnerId}
            onChange={(v) => setForm({ ...form, partnerId: v })}
            allowAll
            allLabel="All partners"
            allValue="all"
            className="dm-input"
            showReload={false}
            includeStatuses={['all']}
          />
        </div>
        <div>
          <label className="dm-label">Category</label>
          <select className="dm-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="dm-label">Type</label>
          <input className="dm-input" placeholder="PDF, Canva, Doc, link…" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="dm-label">Title</label>
          <input className="dm-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="dm-label">URL</label>
          <input className="dm-input" type="url" required placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </div>
        <div className="flex items-end">
          <button type="submit" className="dm-btn-primary text-sm" disabled={saving}>
            {saving ? 'Saving…' : 'Add Resource'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-3">
        <PartnerSelect
          value={filterPartner}
          onChange={setFilterPartner}
          allowAll
          allLabel="Filter: all partners"
          allValue="all"
          className="dm-input w-auto min-w-[200px]"
          showReload={false}
          includeStatuses={['all']}
        />
        <select className="dm-input w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {resources.map((r) => (
          <div key={r.id} className="dm-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-gold-dark" />
                <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-stone-800 hover:text-gold-dark hover:underline">
                  {r.title}
                </a>
                <span className="dm-badge text-xs capitalize">{r.category}</span>
                <span className="dm-badge text-xs">{r.type || 'link'}</span>
              </div>
              <p className="mt-1 truncate text-xs text-stone-400">{partnerLabel(r.partnerId)} · {r.url}</p>
            </div>
            <button type="button" className="dm-btn-danger text-xs" onClick={() => remove(r.id)}>
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!resources.length && <p className="dm-card p-8 text-center text-sm text-stone-400">No resources yet</p>}
      </div>
    </div>
  );
}
