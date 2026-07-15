import { useMemo, useState } from 'react';
import { Filter, Plus, X } from 'lucide-react';

/** Field catalog — any of these can be used as a custom filter row */
export const LEAD_FILTER_FIELDS = [
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'leadType', label: 'Type (B2C/B2B)', type: 'leadType' },
  { key: 'priority', label: 'Priority', type: 'enum', options: ['low', 'medium', 'high'] },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'project', label: 'Project name', type: 'text' },
  { key: 'projectId', label: 'Project ID', type: 'text' },
  { key: 'classGrade', label: 'Class / Grade', type: 'text' },
  { key: 'schoolCollege', label: 'School / College', type: 'text' },
  { key: 'stream', label: 'Stream', type: 'text' },
  { key: 'partnerName', label: 'Partner name', type: 'text' },
  { key: 'studentName', label: 'Student name', type: 'text' },
  { key: 'companyName', label: 'Company name', type: 'text' },
  { key: 'studentPhone', label: 'Phone', type: 'text' },
  { key: 'leadId', label: 'Lead ID', type: 'text' },
  { key: 'interestedIn', label: 'Product / Interest', type: 'arrayIncludes' },
  { key: 'tags', label: 'Tag', type: 'arrayIncludes' },
  { key: 'assignedSalesId', label: 'Assigned Sales ID', type: 'text' },
  { key: 'assignedCounsellorId', label: 'Assigned Counsellor ID', type: 'text' },
];

function matchRule(lead, rule, statuses = []) {
  if (!rule?.field || rule.value === '' || rule.value == null) return true;
  const field = LEAD_FILTER_FIELDS.find((f) => f.key === rule.field);
  const raw = lead[rule.field];
  const val = String(rule.value).toLowerCase().trim();
  if (field?.type === 'status') return String(raw || '').toLowerCase() === val;
  if (field?.type === 'leadType') {
    const t = lead.leadType || 'student';
    return t === rule.value;
  }
  if (field?.type === 'enum') return String(raw || '').toLowerCase() === val;
  if (field?.type === 'arrayIncludes') {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.some((x) => String(x).toLowerCase().includes(val));
  }
  return String(raw ?? '').toLowerCase().includes(val);
}

export function applyCustomLeadFilters(leads, rules = []) {
  const active = (rules || []).filter((r) => r.field && r.value !== '' && r.value != null);
  if (!active.length) return leads || [];
  return (leads || []).filter((lead) => active.every((rule) => matchRule(lead, rule)));
}

/**
 * Custom filter builder — add any number of field/value rows.
 */
export default function CustomLeadFilters({ rules, onChange, statuses = [] }) {
  const [open, setOpen] = useState(false);
  const used = useMemo(() => (rules || []).length, [rules]);

  const addRule = () => {
    onChange([...(rules || []), { id: `f-${Date.now()}`, field: 'status', value: '' }]);
    setOpen(true);
  };

  const updateRule = (id, patch) => {
    onChange((rules || []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id) => onChange((rules || []).filter((r) => r.id !== id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="dm-btn-ghost text-xs" onClick={() => setOpen((o) => !o)}>
          <Filter className="h-3.5 w-3.5" /> Custom filters {used > 0 ? `(${used})` : ''}
        </button>
        <button type="button" className="dm-btn-ghost text-xs" onClick={addRule}>
          <Plus className="h-3.5 w-3.5" /> Add filter
        </button>
        {used > 0 && (
          <button type="button" className="text-xs text-stone-500 hover:underline" onClick={() => onChange([])}>
            Clear all
          </button>
        )}
      </div>
      {(open || used > 0) && (
        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/80 p-3">
          {(rules || []).map((rule) => {
            const field = LEAD_FILTER_FIELDS.find((f) => f.key === rule.field);
            return (
              <div key={rule.id} className="flex flex-wrap items-center gap-2">
                <select
                  className="dm-input w-auto min-w-[10rem]"
                  value={rule.field}
                  onChange={(e) => updateRule(rule.id, { field: e.target.value, value: '' })}
                >
                  {LEAD_FILTER_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                {field?.type === 'status' ? (
                  <select className="dm-input w-auto min-w-[8rem]" value={rule.value} onChange={(e) => updateRule(rule.id, { value: e.target.value })}>
                    <option value="">Any</option>
                    {(statuses.length ? statuses : []).map((s) => (
                      <option key={s.value || s} value={s.value || s}>{s.label || s}</option>
                    ))}
                  </select>
                ) : field?.type === 'leadType' ? (
                  <select className="dm-input w-auto" value={rule.value} onChange={(e) => updateRule(rule.id, { value: e.target.value })}>
                    <option value="">Any</option>
                    <option value="student">Potential Student (B2C)</option>
                    <option value="business">Potential Partner (B2B)</option>
                  </select>
                ) : field?.type === 'enum' ? (
                  <select className="dm-input w-auto" value={rule.value} onChange={(e) => updateRule(rule.id, { value: e.target.value })}>
                    <option value="">Any</option>
                    {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    className="dm-input min-w-[10rem] flex-1"
                    placeholder="Value…"
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  />
                )}
                <button type="button" className="rounded-lg p-2 text-stone-400 hover:bg-white hover:text-red-600" onClick={() => removeRule(rule.id)} aria-label="Remove">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {!rules?.length && <p className="text-xs text-stone-400">Add a filter to narrow leads by any field.</p>}
        </div>
      )}
    </div>
  );
}
