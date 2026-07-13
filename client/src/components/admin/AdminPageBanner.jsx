/** Visible page title so users always know where they are */
export default function AdminPageBanner({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
