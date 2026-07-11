import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function PublicNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm font-medium text-stone-600 hover:text-gold-dark">Features</a>
          <a href="#partners" className="text-sm font-medium text-stone-600 hover:text-gold-dark">Partner Types</a>
          <a href="#how-it-works" className="text-sm font-medium text-stone-600 hover:text-gold-dark">How It Works</a>
          <a href="#faq" className="text-sm font-medium text-stone-600 hover:text-gold-dark">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <button type="button" className="dm-btn-primary text-sm" onClick={() => navigate(user.role === 'admin' ? '/admin' : '/partner')}>
              Go to Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="dm-btn-ghost text-sm">Sign In</Link>
              <Link to="/signup" className="dm-btn-primary text-sm">Become a Partner</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
