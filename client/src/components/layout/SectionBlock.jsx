/** Nested card block inside a dashboard section */
export default function SectionBlock({ title, description, actions, children, className = '' }) {
  return (
    <div className={`dm-card space-y-4 p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="dm-section-title">{title}</h3>}
            {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
