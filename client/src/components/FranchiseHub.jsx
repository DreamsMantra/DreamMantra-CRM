import { useEffect, useState } from 'react';
import {
  MapPin, Store, Target, IndianRupee, CheckCircle, Circle,
  FileText, Presentation, Image, TrendingUp, Award, Building2,
} from 'lucide-react';
import { api } from '../api';
import { FRANCHISE_ONBOARDING_STEPS, franchiseTierMeta, formatCurrency } from '../utils/constants';
import StatCard from './StatCard';
import BarChart from './charts/BarChart';

const KIT_ICONS = { document: FileText, presentation: Presentation, media: Image };

export default function FranchiseHub({ onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const hub = await api.partner.franchiseHub();
      setData(hub);
    } catch (err) {
      setError(err.message || 'Failed to load franchise hub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleStep = async (key, value) => {
    if (['firstLeadSubmitted', 'payoutDetailsAdded'].includes(key)) return;
    await api.partner.updateFranchiseOnboarding({ [key]: value });
    load();
    onRefresh?.();
  };

  if (loading) return <div className="dm-card p-12 text-center text-stone-400">Loading franchise hub...</div>;
  if (error) return <div className="dm-alert-error">{error}</div>;
  if (!data) return null;

  const { partner, stats, onboarding, monthlyTrend, marketingKit, territory } = data;
  const tier = franchiseTierMeta(partner.investmentTier);

  return (
    <div className="space-y-6">
      <div className="dm-card overflow-hidden border-gold/30 bg-gradient-to-br from-gold/10 via-white to-orange/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="dm-badge bg-gold/20 text-gold-dark">Franchise Partner</span>
            <h2 className="mt-2 font-display text-2xl font-bold text-stone-900">{partner.franchiseName || partner.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-stone-600">
              <MapPin className="h-4 w-4 text-orange" /> Territory: <strong>{territory}</strong>
            </p>
            <p className="mt-1 font-mono text-sm text-gold-dark">Code: {partner.franchiseCode} · {partner.loginId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-stone-500">{tier.label}</p>
            <p className="text-sm text-stone-600">{stats.outletCount} outlet{stats.outletCount > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Monthly Leads" value={`${stats.monthLeads}/${stats.monthlyTarget}`} sub={`${stats.targetProgress}% of target`} accent="orange" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversionRate}%`} sub={`${stats.converted} converted`} accent="green" />
        <StatCard icon={IndianRupee} label="Paid Commission" value={formatCurrency(stats.paidCommission)} sub={`${formatCurrency(stats.pendingCommission)} pending`} accent="gold" />
        <StatCard icon={Store} label="Outlets" value={stats.outletCount} sub={partner.operatingModel?.replace(/_/g, ' ')} accent="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dm-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-stone-900">
            <Award className="h-5 w-5 text-gold-dark" /> Onboarding Checklist
            <span className="ml-auto text-sm font-normal text-stone-500">{stats.onboardingProgress}% complete</span>
          </h3>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-gradient-to-r from-gold to-orange transition-all" style={{ width: `${stats.onboardingProgress}%` }} />
          </div>
          <ul className="space-y-3">
            {FRANCHISE_ONBOARDING_STEPS.map(({ key, label }) => {
              const done = onboarding[key];
              const locked = ['firstLeadSubmitted', 'payoutDetailsAdded'].includes(key);
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => toggleStep(key, !done)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${done ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 hover:border-gold/40'} ${locked ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                  >
                    {done ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-stone-300" />}
                    <span className={`text-sm ${done ? 'text-emerald-800 line-through' : 'text-stone-700'}`}>{label}</span>
                    {locked && <span className="ml-auto text-[10px] text-stone-400">Auto</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="dm-card p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-stone-900">Territory Lead Trend</h3>
          <BarChart
            data={monthlyTrend.map((m) => ({ label: m.label, total: m.franchiseLeads }))}
            color="gold"
          />
        </div>
      </div>

      <div className="dm-card p-6">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-stone-900">
          <Building2 className="h-5 w-5 text-orange" /> Franchise Marketing Kit
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {marketingKit.map((item) => {
            const Icon = KIT_ICONS[item.type] || FileText;
            return (
              <a key={item.title} href={item.url} className="flex items-center gap-3 rounded-xl border border-stone-200 p-4 transition hover:border-gold/40 hover:bg-stone-50">
                <div className="rounded-lg bg-orange/10 p-2 text-orange"><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-stone-900">{item.title}</p>
                  <p className="text-xs capitalize text-stone-500">{item.type}</p>
                </div>
              </a>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-stone-400">Contact admin for branded assets and centre launch support materials.</p>
      </div>

      <div className="dm-card grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Agreement Date</p>
          <p className="mt-1 font-medium text-stone-900">{partner.agreementDate || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Commission Rate</p>
          <p className="mt-1 font-medium text-stone-900">{partner.commissionRate}% per conversion</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Referral Code</p>
          <p className="mt-1 font-mono font-bold text-gold-dark">{partner.referralCode}</p>
        </div>
      </div>
    </div>
  );
}
