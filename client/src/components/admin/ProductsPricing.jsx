import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatCurrency } from '../../utils/constants';

import AdminPageHeader from './AdminPageHeader';

export default function ProductsPricing({ embedded = false }) {
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => api.admin.products().then((r) => setProducts(r.products || []));

  useEffect(() => { load(); }, []);

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

  const save = async () => {
    await api.admin.updateProducts(products);
    setMsg('Products & commission rules saved');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-4">
      {!embedded && <AdminPageHeader title="Products & Pricing" onRefresh={load} onSave={save} saveLabel="Save All Products" />}
      {embedded && (
        <div className="flex items-center justify-between">
          <h3 className="dm-section-title">Products & Pricing</h3>
          <button type="button" className="dm-btn-gold text-sm" onClick={save}>Save All Products</button>
        </div>
      )}
      {msg && <p className="text-emerald-600 text-sm">{msg}</p>}
      <div className="space-y-3">
        {products.map((p, i) => (
          <div key={p.id} className="dm-card p-4 grid gap-3 md:grid-cols-4">
            <div><label className="dm-label">Product</label><input className="dm-input" value={p.label} onChange={(e) => update(i, 'label', e.target.value)} /></div>
            <div><label className="dm-label">Price (₹)</label><input type="number" className="dm-input" value={p.price} onChange={(e) => update(i, 'price', Number(e.target.value))} /></div>
            <div><label className="dm-label">Commission Type</label>
              <select className="dm-input" value={p.commission?.type || 'fixed'} onChange={(e) => updateCommission(i, 'type', e.target.value)}>
                <option value="fixed">Fixed ₹</option>
                <option value="percentage">Percentage %</option>
              </select>
            </div>
            <div><label className="dm-label">Commission Value</label><input type="number" className="dm-input" value={p.commission?.value || 0} onChange={(e) => updateCommission(i, 'value', Number(e.target.value))} /></div>
          </div>
        ))}
      </div>
      <p className="text-sm text-stone-500">Example: Brain Mapping → ₹200 fixed · AI Career Launchpad → 10% · Dream Mantra Internal → ₹0</p>
    </div>
  );
}
