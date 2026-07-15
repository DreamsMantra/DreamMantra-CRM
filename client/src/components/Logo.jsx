import { Link } from 'react-router-dom';

/** Official Dream Mantra logo — always navigates to the public home page. */
export default function Logo({ className = '', size = 'md', to = '/' }) {
  const heights = { sm: 'h-8', md: 'h-10', lg: 'h-12' };
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 ${className}`}
      title="Dream Mantra — open website home"
    >
      <img
        src="/logo/dream-mantra-logo.png"
        alt="Dream Mantra"
        className={`${heights[size] || heights.md} w-auto max-w-[180px] object-contain object-left`}
      />
      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500">
        CRM
      </span>
    </Link>
  );
}
