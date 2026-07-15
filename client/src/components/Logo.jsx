import { Link } from 'react-router-dom';

/** Official Dream Mantra logo — navigates to the public home page. */
export default function Logo({ className = '', size = 'md', to = '/', showText = true }) {
  const heights = { sm: 'h-12', md: 'h-16', lg: 'h-20' };
  const textSizes = { sm: 'text-sm sm:text-base', md: 'text-base sm:text-lg', lg: 'text-lg sm:text-xl' };
  return (
    <Link
      to={to}
      className={`inline-flex max-w-full items-center gap-3 ${className}`}
      title="Dream Mantra CRM — open website home"
    >
      <img
        src="/logo/dream-mantra-logo.png"
        alt="Dream Mantra CRM"
        className={`${heights[size] || heights.md} w-auto max-w-[min(260px,58vw)] object-contain object-left`}
      />
      {showText && (
        <span className={`min-w-0 font-display font-bold leading-tight ${textSizes[size] || textSizes.md}`}>
          <span className="dm-gradient-text block truncate">Dreams Mantra CRM</span>
        </span>
      )}
    </Link>
  );
}
