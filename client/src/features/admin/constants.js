export const LOGIN_PREFIX = {
  referral_partner: 'REF', teacher: 'TCH', school: 'SCH', college: 'COL',
  coaching_center: 'CCH', influencer: 'INF', counsellor: 'CNS', agency: 'AGY',
};

export function suggestLoginId(partnerType) {
  const prefix = LOGIN_PREFIX[partnerType] || 'PTR';
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

export const emptyPartner = {
  name: '', email: '', phone: '', loginId: '', password: '', partnerType: 'teacher',
  organization: '', city: '', state: '', address: '',
  status: 'active', tier: 'bronze', notes: '',
  agencyName: '', territory: '', outletCount: 1, investmentTier: 'starter',
  operatingModel: 'single_outlet', royaltyPercent: 8, agreementDate: '',
};

export const SETTINGS_FIELDS = [
  { key: 'companyName', label: 'Company Name', type: 'text' },
  { key: 'supportEmail', label: 'Support Email', type: 'email' },
  { key: 'supportPhone', label: 'Support Phone', type: 'text' },
  { key: 'whatsappNumber', label: 'WhatsApp Number', type: 'text' },
  { key: 'minPayoutAmount', label: 'Min Payout (₹)', type: 'number' },
  { key: 'welcomeMessage', label: 'Welcome Message', type: 'textarea' },
  { key: 'autoApprovePartners', label: 'Auto-approve Partners', type: 'checkbox' },
];
