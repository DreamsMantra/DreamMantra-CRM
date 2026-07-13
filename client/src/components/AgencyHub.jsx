import { useEffect, useState } from 'react';
import {
  MapPin, Building2, Target, IndianRupee, CheckCircle, Circle,
  FileText, Presentation, Image, TrendingUp, Award, UsersRound,
} from 'lucide-react';
import { api } from '../api';
import { AGENCY_ONBOARDING_STEPS, agencyTierMeta, formatCurrency } from '../utils/constants';
import StatCard from './StatCard';
import BarChart from './charts/BarChart';

const KIT_ICONS = { document: FileText, presentation: Presentation, media: Image };

export default function AgencyHub({ onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const hub = await api.partner.agencyHub();
      setData(hub);
    } catch (err) {
      setError(err.message || 'Failed to load agency hub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleStep = async (key, value) => {
    if (['firstLeadSubmitted', 'payoutDetailsAdded'].includes(key)) return;
    await api.partner.updateAgencyOnboarding({ [key]: value });
    load();
    onRefresh?.();
  };

  if (loading) return <div className="dm-card p-12 text-center text-stone-400">Loading agency hub...</div>;
  if (error) return <div className="dm-alert-error">{error}</div>;
  if (!data) return null;

  const { partner, stats, onboarding, monthlyTrend, marketingKit, territory, team } = data;
  const tier = agencyTierMeta(partner.investmentTier);
  const chartData = monthlyTrend?.map((m) => ({ label: m.month?.slice(5) || m.month, value: m.agencyLeads || m.franchiseLeads || 0 })) || [];

  return (
    <div className="space-y-6">
      <div className="dm-card overflow-hidden border-gold/30 bg-gradient-to-br from-gold/10 via-white to-orange/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="dm-badge bg-gold/20 text-gold-dark">Agency Partner</span>
            <h2 className="mt-2 font-display text-2xl font-bold text-stone-900">{partner.agencyName || partner.franchiseName || partner.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-stone-600">
              <MapPin className="h-4 w-4 text-orange" /> Territory: <strong>{territory}</strong>
            </p>
            <p className="mt-1 font-mono text-sm text-gold-dark">Code: {partner.agencyCode || partner.franchiseCode} · {partner.loginId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-stone-500">{tier.label}</p>
            <p className="text-sm text-stone-600">{stats.outletCount} centre{stats.outletCount > 1 ? 's' : ''} · {stats.royaltyPercent}% royalty</p>
            {stats.teamSize > 0 && <p className="text-sm text-stone-500 flex items-center justify-end gap-1"><UsersRound className="h-3 w-3" /> {stats.teamSize} team members</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Monthly Leads" value={`${stats.monthLeads}/${stats.monthlyTarget}`} sub={`${stats.targetProgress}% of target`} accent="orange" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversionRate}%`} sub={`${stats.converted} converted`} accent="green" />
        <StatCard icon={IndianRupee} label="Paid Commission" value={formatCurrency(stats.paidCommission)} sub={`${formatCurrency(stats.pendingCommission)} pending`} accent="gold" />
        <StatCard icon={Building2} label="Centres" value={stats.outletCount} sub={partner.operatingModel?.replace(/_/g, ' ')} accent="blue" />
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
          <ul className="space-y-2">
            {AGENCY_ONBOARDING_STEPS.map(({ key, label }) => {
              const done = onboarding[key];
              const locked = ['firstLeadSubmitted', 'payoutDetailsAdded'].includes(key);
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => toggleStep(key, !done)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm transition ${done ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-stone-50'} ${locked ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {done ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-stone-300" />}
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="dm-card p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-stone-900">Lead Trend (6 months)</h3>
          {chartData.length > 0 ? <BarChart data={chartData} color="#d97706" /> : <p className="text-stone-400 text-sm">No data yet</p>}
        </div>
      </div>

      <div className="dm-card p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-stone-900">Marketing & Training Kit</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {marketingKit.map((item) => {
            const Icon = KIT_ICONS[item.type] || FileText;
            return (
              <a key={item.title} href={item.url} className="flex items-center gap-3 rounded-xl border border-stone-200 p-4 hover:border-gold/40 hover:bg-gold/5 transition">
                <Icon className="h-5 w-5 text-gold-dark" />
                <span className="text-sm font-medium text-stone-700">{item.title}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
