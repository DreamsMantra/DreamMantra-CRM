export const PARTNER_TIERS = [
  { value: 'bronze', label: 'Bronze', minLeads: 0 },
  { value: 'silver', label: 'Silver', minLeads: 10 },
  { value: 'gold', label: 'Gold', minLeads: 25 },
  { value: 'platinum', label: 'Platinum', minLeads: 50 },
];

export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const BUDGET_OPTIONS = ['Under ₹5,000', '₹5,000 - ₹15,000', '₹15,000 - ₹30,000', '₹30,000+'];

export const CONTACT_TIME_OPTIONS = ['Morning (9-12)', 'Afternoon (12-4)', 'Evening (4-8)', 'Anytime'];

export const PARTNER_TYPES = [
  { value: 'referral_partner', label: 'Referral Partner' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'coaching_center', label: 'Coaching Center' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'counsellor', label: 'Counsellor' },
  { value: 'franchise', label: 'Franchise Partner' },
];

export const FRANCHISE_INVESTMENT_TIERS = [
  { value: 'starter', label: 'Starter (₹5–10L)', royalty: 8, leadTarget: 30 },
  { value: 'growth', label: 'Growth (₹10–25L)', royalty: 6, leadTarget: 60 },
  { value: 'flagship', label: 'Flagship (₹25L+)', royalty: 5, leadTarget: 100 },
];

export const FRANCHISE_OPERATING_MODELS = [
  { value: 'single_outlet', label: 'Single Outlet' },
  { value: 'multi_outlet', label: 'Multi Outlet' },
  { value: 'master_franchise', label: 'Master Franchise (City Rights)' },
];

export const FRANCHISE_ONBOARDING_STEPS = [
  { key: 'agreementSigned', label: 'Franchise agreement signed' },
  { key: 'trainingCompleted', label: 'Counsellor training completed' },
  { key: 'brandingSetup', label: 'Branding & centre setup done' },
  { key: 'firstLeadSubmitted', label: 'First student lead submitted' },
  { key: 'payoutDetailsAdded', label: 'Payout details added' },
  { key: 'launchEventDone', label: 'Launch event / orientation done' },
];

export const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'contacted', label: 'Contacted', color: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'interested', label: 'Interested', color: 'bg-purple-500/20 text-purple-300' },
  { value: 'counselling_scheduled', label: 'Counselling Scheduled', color: 'bg-indigo-500/20 text-indigo-300' },
  { value: 'assessment_done', label: 'Assessment Done', color: 'bg-amber-500/20 text-amber-300' },
  { value: 'converted', label: 'Converted', color: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500/20 text-red-300' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-gray-500/20 text-gray-300' },
];

export const INTEREST_OPTIONS = [
  'Career Counselling',
  'DMIT',
  'Psychometric Assessment',
  'Mind Mapping',
  'Skill Mapping',
  'Study Abroad',
  'College Admission',
  'Workshop / Seminar',
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
];

export function franchiseTierMeta(tier) {
  return FRANCHISE_INVESTMENT_TIERS.find((t) => t.value === tier) || FRANCHISE_INVESTMENT_TIERS[0];
}

export function partnerTypeLabel(type) {
  return PARTNER_TYPES.find((p) => p.value === type)?.label || type;
}

export function statusMeta(status) {
  return LEAD_STATUSES.find((s) => s.value === status) || { label: status, color: 'bg-white/10 text-white/70' };
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}
