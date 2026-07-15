import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { formatCurrency } from '../../utils/constants';
import PartnerSelect from '../PartnerSelect';
import AdminPageHeader from './AdminPageHeader';

const emptyRate = {
  audience: 'partner',
  productId: '',
  partnerId: '',
  listPrice: 0,
  salePrice: 0,
};

export default function ProductsPricing({ embedded = false }) {
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState(emptyRate);
  const [editingRateId, setEditingRateId] = useState(null);
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
      const [prodRes, allocRes, ratesRes, partnersRes] = await Promise.all([
        api.admin.products(),
        api.admin.productAllocations(),
        api.admin.rates(),
        api.admin.partners({ status: 'all' }),
      ]);
      setProducts(prodRes.products || []);
      setAllocations(allocRes.allocations || []);
      setRates(ratesRes.rates || []);
      setPartners(partnersRes.partners || []);
    } catch (err) {
      setError(err.message || 'Failed to load products & rates');
    }
  };

  useEffect(() => { load(); }, []);

  const productLabel = (id) => products.find((p) => p.id === id)?.label || id || '—';
  const partnerLabel = (id) => {
    if (!id) return 'All / default';
    if (id === 'all') return 'All partners';
    return partners.find((p) => p.id === id)?.name || id;
  };

  const getPartnerIds = (productId) =>
    allocations.find((a) => a.productId === productId)?.partnerIds || [];

  const setPartnerAlloc = (productId, partnerId, checked) => {
    setAllocations((prev) => {
      const existing = prev.find((a) => a.productId === productId);
      const current = existing?.partnerIds || [];
      let nextIds;
      if (checked) nextIds = current.includes(partnerId) ? current : [...current, partnerId];
      else nextIds = current.filter((id) => id !== partnerId);
      const rest = prev.filter((a) => a.productId !== productId);
      return [...rest, { productId, partnerIds: nextIds }];
    });
  };

  const update = (idx, field, value) => {
    const next = [...products];
    next[idx] = { ...next[idx], [field]: value };
    setProducts(next);
  };

  const updateCommission = (idx, field, value) => {
    const next = [...products];
    next[idx] = { ...next[idx], commission: { ...next[idx].commission, [field]: value } };
    setProducts(next);
  };

  const saveProducts = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = products.map((p) => ({
        id: p.id,
        label: p.label,
        price: Number(p.costPrice ?? p.price) || 0,
        costPrice: Number(p.costPrice ?? p.price) || 0,
        defaultSellingPrice: Number(p.defaultSellingPrice ?? p.price) || 0,
        commission: p.commission,
      }));
      const res = await api.admin.updateProducts(payload);
      setProducts(res.products || payload);
      flash('Products & prices saved');
    } catch (err) {
      setError(err.message || 'Failed to save products');
    } finally {
      setSaving(false);
    }
  };

  const addProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: `prod_${Date.now()}`,
        label: 'New product',
        price: 0,
        costPrice: 0,
        defaultSellingPrice: 0,
        commission: { type: 'fixed', value: 0 },
      },
    ]);
  };

  const saveAllocations = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = products.map((p) => ({
        productId: p.id,
        partnerIds: getPartnerIds(p.id),
      }));
      const res = await api.admin.updateProductAllocations(payload);
      setAllocations(res.allocations || payload);
      flash('Product allocations saved');
    } catch (err) {
      setError(err.message || 'Failed to save allocations');
    } finally {
      setSaving(false);
    }
  };

  const submitRate = async (e) => {
    e.preventDefault();
    if (!rateForm.productId) {
      setError('Select a product for the rate');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        ...(editingRateId ? { id: editingRateId } : {}),
        audience: rateForm.audience,
        productId: rateForm.productId,
        partnerId: rateForm.partnerId || null,
        listPrice: Number(rateForm.listPrice) || 0,
        salePrice: Number(rateForm.salePrice) || 0,
      };
      await api.admin.upsertRate(body);
      setRateForm(emptyRate);
      setEditingRateId(null);
      flash(editingRateId ? 'Rate updated' : 'Rate created');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save rate');
    } finally {
      setSaving(false);
    }
  };

  const startEditRate = (rate) => {
    setEditingRateId(rate.id);
    setRateForm({
      audience: rate.audience || 'partner',
      productId: rate.productId || '',
      partnerId: rate.partnerId || '',
      listPrice: rate.listPrice ?? 0,
      salePrice: rate.salePrice ?? 0,
    });
  };

  const removeRate = async (id) => {
    if (!confirm('Delete this rate?')) return;
    try {
      await api.admin.deleteRate(id);
      if (editingRateId === id) {
        setEditingRateId(null);
        setRateForm(emptyRate);
      }
      flash('Rate deleted');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete rate');
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <AdminPageHeader title="Products & Pricing" onRefresh={load} onSave={saveProducts} saveLabel="Save Products" />
      )}
      {embedded && (
        <div className="flex items-center justify-between">
          <h3 className="dm-section-title">Products & Pricing</h3>
          <button type="button" className="dm-btn-ghost text-sm" onClick={load}>Refresh</button>
        </div>
      )}
      {msg && <p className="text-emerald-600 text-sm">{msg}</p>}
      {error && <div className="dm-alert-error text-sm">{error}</div>}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-stone-800">Products, cost & selling</h4>
          <div className="flex gap-2">
            <button type="button" className="dm-btn-ghost text-sm" onClick={addProduct}><Plus className="h-4 w-4" /> Add product</button>
            <button type="button" className="dm-btn-gold text-sm" disabled={saving} onClick={saveProducts}>
              Save Products
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {products.map((p, i) => (
            <div key={p.id} className="dm-card p-4 grid gap-3 md:grid-cols-5">
              <div>
                <label className="dm-label">Product</label>
                <input className="dm-input" value={p.label} onChange={(e) => update(i, 'label', e.target.value)} />
              </div>
              <div>
                <label className="dm-label">Cost price (₹)</label>
                <input type="number" className="dm-input" value={p.costPrice ?? p.price ?? ''} onChange={(e) => { update(i, 'price', Number(e.target.value)); update(i, 'costPrice', Number(e.target.value)); }} />
                <p className="mt-0.5 text-[10px] text-stone-400">What we charge the partner</p>
              </div>
              <div>
                <label className="dm-label">Default selling (₹)</label>
                <input type="number" className="dm-input" value={p.defaultSellingPrice ?? ''} onChange={(e) => update(i, 'defaultSellingPrice', Number(e.target.value))} />
                <p className="mt-0.5 text-[10px] text-stone-400">What partner sells to customer</p>
              </div>
              <div>
                <label className="dm-label">Commission Type</label>
                <select className="dm-input" value={p.commission?.type || 'fixed'} onChange={(e) => updateCommission(i, 'type', e.target.value)}>
                  <option value="fixed">Fixed ₹</option>
                  <option value="percentage">Percentage %</option>
                </select>
              </div>
              <div>
                <label className="dm-label">Commission Value</label>
                <input type="number" className="dm-input" value={p.commission?.value || 0} onChange={(e) => updateCommission(i, 'value', Number(e.target.value))} />
              </div>
            </div>
          ))}
          {!products.length && <p className="text-sm text-stone-500">No products configured.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-stone-800">Allocate to partners</h4>
            <p className="text-xs text-stone-500">Partners only see products checked for them.</p>
          </div>
          <button type="button" className="dm-btn-gold text-sm" disabled={saving} onClick={saveAllocations}>
            Save Allocations
          </button>
        </div>
        <div className="space-y-3">
          {products.map((p) => {
            const selected = getPartnerIds(p.id);
            return (
              <div key={`alloc-${p.id}`} className="dm-card p-4">
                <p className="mb-2 font-medium text-stone-800">{p.label}</p>
                <div className="mb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes('all')}
                      onChange={(e) => setPartnerAlloc(p.id, 'all', e.target.checked)}
                    />
                    All partners
                  </label>
                </div>
                <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {partners.map((partner) => (
                    <label key={partner.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-stone-50">
                      <input
                        type="checkbox"
                        checked={selected.includes(partner.id)}
                        onChange={(e) => setPartnerAlloc(p.id, partner.id, e.target.checked)}
                      />
                      <span>{partner.name}{partner.loginId ? ` (${partner.loginId})` : ''}</span>
                    </label>
                  ))}
                </div>
                {!partners.length && <p className="text-xs text-stone-400">No partners loaded.</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-semibold text-stone-800">Extra rates (optional)</h4>
        <p className="text-xs text-stone-500">Cost = price to partner · Selling = price to customer. Prefer partner profile / project overrides for day-to-day pricing.</p>
        <form onSubmit={submitRate} className="dm-card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="dm-label">Audience</label>
            <select className="dm-input" value={rateForm.audience} onChange={(e) => setRateForm({ ...rateForm, audience: e.target.value })}>
              <option value="partner">Partner</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div>
            <label className="dm-label">Product</label>
            <select className="dm-input" value={rateForm.productId} required onChange={(e) => setRateForm({ ...rateForm, productId: e.target.value })}>
              <option value="">Select product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="dm-label">Partner (optional)</label>
            <PartnerSelect
              value={rateForm.partnerId || ''}
              onChange={(v) => setRateForm({ ...rateForm, partnerId: v })}
              allowAll
              allLabel="All / default"
              allValue=""
              placeholder="Default (all)"
              className="dm-input"
              showReload={false}
              includeStatuses={['all']}
            />
          </div>
          <div>
            <label className="dm-label">Cost price (₹)</label>
            <input type="number" className="dm-input" value={rateForm.listPrice} onChange={(e) => setRateForm({ ...rateForm, listPrice: e.target.value })} />
          </div>
          <div>
            <label className="dm-label">Selling price (₹)</label>
            <input type="number" className="dm-input" value={rateForm.salePrice} onChange={(e) => setRateForm({ ...rateForm, salePrice: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="dm-btn-primary text-sm" disabled={saving}>
              <Plus className="mr-1 inline h-3 w-3" />
              {editingRateId ? 'Update Rate' : 'Add Rate'}
            </button>
            {editingRateId && (
              <button type="button" className="dm-btn-ghost text-sm" onClick={() => { setEditingRateId(null); setRateForm(emptyRate); }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="dm-card overflow-x-auto">
          <table className="dm-table w-full">
            <thead>
              <tr>
                <th>Audience</th>
                <th>Product</th>
                <th>Partner</th>
                <th>Cost</th>
                <th>Selling</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td className="capitalize">{r.audience}</td>
                  <td>{productLabel(r.productId)}</td>
                  <td>{partnerLabel(r.partnerId)}</td>
                  <td>{formatCurrency(r.listPrice)}</td>
                  <td className="font-semibold text-emerald-700">{formatCurrency(r.salePrice)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" className="text-xs text-gold-dark" onClick={() => startEditRate(r)}>Edit</button>
                      <button type="button" className="text-xs text-red-600" onClick={() => removeRate(r.id)}>
                        <Trash2 className="inline h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rates.length && <p className="p-6 text-center text-sm text-stone-400">No rates yet</p>}
        </div>
      </section>
    </div>
  );
}
