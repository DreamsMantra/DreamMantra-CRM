import { Link } from 'react-router-dom';

export default function Logo({ className = '', size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-display font-bold ${sizes[size]} ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-orange text-lg shadow-md shadow-orange/20">
        🎯
      </span>
      <span>
        <span className="dm-gradient-text">Dream Mantra</span>
        <span className="ml-1 text-xs font-semibold text-stone-400">CRM</span>
      </span>
    </Link>
  );
}
