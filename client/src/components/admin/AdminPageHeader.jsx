import { RefreshCw, Plus, Save, Pencil } from 'lucide-react';

/** Consistent page header with Super Admin actions */
export default function AdminPageHeader({
  title,
  subtitle,
  onRefresh,
  onAdd,
  addLabel = 'Add New',
  onSave,
  saveLabel = 'Save Changes',
  children,
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="dm-section-title">{title}</h2>
        {subtitle && <p className="text-sm text-stone-600 mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onRefresh && (
          <button type="button" className="dm-btn-ghost text-sm flex items-center gap-1" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        )}
        {onAdd && (
          <button type="button" className="dm-btn-primary text-sm flex items-center gap-1" onClick={onAdd}>
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        )}
        {onSave && (
          <button type="button" className="dm-btn-gold text-sm flex items-center gap-1" onClick={onSave}>
            <Save className="h-4 w-4" /> {saveLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function EditButton({ onClick, label = 'Edit' }) {
  return (
    <button type="button" className="dm-btn-ghost text-xs flex items-center gap-1 text-gold-dark" onClick={onClick}>
      <Pencil className="h-3 w-3" /> {label}
    </button>
  );
}
