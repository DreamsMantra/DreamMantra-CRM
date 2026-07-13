import AdminSubTabs from '../admin/AdminSubTabs';

/** Unified page section: title, description, optional sub-tabs, actions */
export default function DashboardSection({ title, description, actions, subTabs, activeSub, onSubChange, children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-stone-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {subTabs?.length > 0 && (
        <AdminSubTabs tabs={subTabs} active={activeSub} onChange={onSubChange} />
      )}
      {children}
    </div>
  );
}
