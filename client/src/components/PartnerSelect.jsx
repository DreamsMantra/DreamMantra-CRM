import { useEffect, useState } from 'react';
import { api } from '../api';

/** Self-loading partner dropdown for admin filters, import, and bulk tools. */
export default function PartnerSelect({
  value,
  onChange,
  placeholder = 'Select partner',
  className = 'dm-input max-w-md',
  includeStatuses = ['active', 'pending', 'suspended'],
  allowAll = false,
  allLabel = 'All Partners',
  allValue = 'all',
  required = false,
  showMeta = true,
  showReload = true,
}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.partners({ status: 'all' });
      const list = (res.partners || [])
        .filter((p) => includeStatuses.includes('all') || includeStatuses.includes(p.status))
        .sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (b.status === 'active' && a.status !== 'active') return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
      setPartners(list);
    } catch (err) {
      setError(err.message || 'Failed to load partners');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={className}
          value={value ?? (allowAll ? allValue : '')}
          required={required && !(allowAll && value === allValue)}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={loading}
        >
          {allowAll ? (
            <option value={allValue}>{loading ? 'Loading…' : allLabel}</option>
          ) : (
            <option value="">{loading ? 'Loading partners…' : placeholder}</option>
          )}
          {partners.map((p) => (
            <option key={p.id || p._id} value={p.id || p._id}>
              {p.name}{p.loginId ? ` (${p.loginId})` : ''}{showMeta ? ` — ${p.status}` : ''}
            </option>
          ))}
        </select>
        {showReload && (
          <button type="button" className="dm-btn-ghost text-xs whitespace-nowrap" onClick={load} disabled={loading}>
            {loading ? '…' : 'Reload'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!loading && !error && partners.length === 0 && (
        <p className="text-xs text-amber-700">No partners found. Create or approve a partner first.</p>
      )}
    </div>
  );
}
