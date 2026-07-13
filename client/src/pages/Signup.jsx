import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, Lock, Building2, MapPin, Loader2, CheckCircle, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { PARTNER_TYPES, INDIAN_STATES, FRANCHISE_INVESTMENT_TIERS, FRANCHISE_OPERATING_MODELS } from '../utils/constants';
import { fieldEnabled, fieldLabel, fieldRequired } from '../utils/formTemplate';
import { api } from '../api';

export default function Signup() {
  const { register } = useAuth();
  const [params] = useSearchParams();
  const isAgency = params.get('type') === 'agency' || params.get('type') === 'franchise';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    partnerType: isAgency ? 'agency' : 'teacher',
    organization: '',
    city: '',
    state: 'Rajasthan',
    address: '',
    agencyName: '',
    territory: '',
    outletCount: 1,
    investmentTier: 'starter',
    operatingModel: 'single_outlet',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [templateFields, setTemplateFields] = useState([]);

  useEffect(() => {
    api.auth.formTemplate('registration').then((r) => setTemplateFields(r.fields || [])).catch(() => {});
  }, []);

  const show = (key) => fieldEnabled(templateFields, key);
  const lbl = (key, fb) => fieldLabel(templateFields, key, fb);
  const req = (key, fb) => fieldRequired(templateFields, key, fb);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center dm-hero-bg p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md dm-card p-8 text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-emerald-400" />
          <h2 className="mt-4 font-display text-2xl font-bold text-stone-900">Registration Submitted!</h2>
          <p className="mt-2 text-stone-600">
            {form.partnerType === 'agency'
              ? 'Your agency application is under review. Our team will contact you within 48 hours.'
              : 'Your partner account is pending admin approval. You will be notified once activated.'}
          </p>
          <Link to="/login" className="dm-btn-primary mt-6 inline-flex">Go to Sign In</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dm-hero-bg py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <Logo className="justify-center" />
          <h1 className="mt-4 font-display text-3xl font-bold text-stone-900">
            {form.partnerType === 'agency' ? 'Agency Application' : 'Join Partner Network'}
          </h1>
          <p className="mt-2 text-stone-600">
            {form.partnerType === 'agency'
              ? 'Apply to open a Dream Mantra career counselling centre in your territory'
              : 'Schools, colleges, teachers, coaching centers & referral partners'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="dm-card space-y-5 p-8">
          {form.partnerType === 'agency' && (
            <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-stone-700">
              <Store className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" />
              <p>Agency partners get a dedicated Agency Hub, territory tracking, marketing kit, and premium 15% commission on conversions.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="dm-label">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input className="dm-input pl-10" value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="dm-label">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input type="email" className="dm-input pl-10" value={form.email} onChange={(e) => update('email', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="dm-label">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input className="dm-input pl-10" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="dm-label">Partner Type *</label>
              <select className="dm-input" value={form.partnerType} onChange={(e) => update('partnerType', e.target.value)}>
                {PARTNER_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="dm-label">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input type="password" className="dm-input pl-10" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={6} required />
              </div>
            </div>

            {form.partnerType === 'agency' && show('agencyName') && (
              <>
                <div className="sm:col-span-2">
                  <label className="dm-label">Agency / Centre Name *</label>
                  <input className="dm-input" value={form.agencyName} onChange={(e) => update('agencyName', e.target.value)} placeholder="Dream Mantra Jaipur Centre" required />
                </div>
                <div>
                  <label className="dm-label">Territory / City Rights *</label>
                  <input className="dm-input" value={form.territory} onChange={(e) => update('territory', e.target.value)} placeholder="Jaipur North" required />
                </div>
                <div>
                  <label className="dm-label">Planned Outlets</label>
                  <input type="number" min={1} className="dm-input" value={form.outletCount} onChange={(e) => update('outletCount', Number(e.target.value))} />
                </div>
                <div>
                  <label className="dm-label">Investment Tier</label>
                  <select className="dm-input" value={form.investmentTier} onChange={(e) => update('investmentTier', e.target.value)}>
                    {FRANCHISE_INVESTMENT_TIERS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="dm-label">Operating Model</label>
                  <select className="dm-input" value={form.operatingModel} onChange={(e) => update('operatingModel', e.target.value)}>
                    {FRANCHISE_OPERATING_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="dm-label">{form.partnerType === 'agency' ? 'Company / Entity Name' : 'Organization / School / College Name'}</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input className="dm-input pl-10" value={form.organization} onChange={(e) => update('organization', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="dm-label">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input className="dm-input pl-10" value={form.city} onChange={(e) => update('city', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="dm-label">State</label>
              <select className="dm-input" value={form.state} onChange={(e) => update('state', e.target.value)}>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={loading} className="dm-btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {form.partnerType === 'agency' ? 'Submit Agency Application' : 'Submit Registration'}
          </button>

          <p className="text-center text-sm text-stone-500">
            Already have an account? <Link to="/login" className="font-semibold text-gold-dark">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
