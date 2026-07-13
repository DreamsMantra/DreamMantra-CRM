import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import CompanyInfoSection from '../components/CompanyInfoSection';
import { getDashboardPath } from '../config/roleNavigation';
import { COMPANY } from '../utils/companyInfo';

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!authLoading && user) {
    navigate(getDashboardPath(user.role), { replace: true });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(identifier.trim(), password);
      navigate(getDashboardPath(data.user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen dm-hero-bg">
      <div className="hidden w-1/2 flex-col justify-between p-12 lg:flex">
        <Logo size="lg" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-dark">
            <Sparkles className="h-4 w-4" /> Partner CRM · Dream Mantra
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-stone-900">
            Sign in with your <span className="dm-gradient-text">Partner ID</span> or email
          </h1>
          <p className="mt-4 max-w-md text-lg text-stone-600">
            Track student leads, commissions, and referrals — all in one professional dashboard.
          </p>
          <div className="mt-6 max-w-md">
            <CompanyInfoSection compact />
          </div>
        </motion.div>
        <p className="text-sm text-stone-400">
          © {COMPANY.name} · <a href={COMPANY.website} target="_blank" rel="noreferrer" className="hover:text-gold-dark">dreammantra.in</a>
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md dm-card p-8"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="font-display text-2xl font-bold text-stone-900">Welcome back</h2>
          <p className="mt-1 text-sm text-stone-500">Use Partner ID (e.g. TCH-A1B2C3) or your email</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="dm-label">Partner ID or Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  className="dm-input pl-10 font-mono"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="TCH-ABC123 or you@school.edu"
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="dm-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  className="dm-input pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="dm-btn-primary w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Sign In
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            New partner?{' '}
            <Link to="/signup" className="font-semibold text-gold-dark hover:text-orange">
              Register here
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-stone-400">
            Admin? Use your admin email to sign in.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
