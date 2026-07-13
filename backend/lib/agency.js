/** Agency partner helpers — franchise legacy fields normalized to agency */

export const AGENCY_INVESTMENT_TIERS = {
  starter: { label: 'Starter (₹5–10L)', royalty: 8, leadTarget: 30 },
  growth: { label: 'Growth (₹10–25L)', royalty: 6, leadTarget: 60 },
  flagship: { label: 'Flagship (₹25L+)', royalty: 5, leadTarget: 100 },
};

export const AGENCY_OPERATING_MODELS = [
  'single_outlet', 'multi_outlet', 'master_agency',
];

export const AGENCY_ONBOARDING_KEYS = [
  'agreementSigned', 'trainingCompleted', 'brandingSetup',
  'firstLeadSubmitted', 'payoutDetailsAdded', 'launchEventDone',
];

export function isAgencyPartner(user) {
  if (!user || user.role !== 'partner') return false;
  return user.partnerType === 'agency' || user.partnerType === 'franchise';
}

export function normalizeAgencyUser(user) {
  if (!user) return user;
  const partnerType = user.partnerType === 'franchise' ? 'agency' : user.partnerType;
  const onboarding = user.agencyOnboarding || user.franchiseOnboarding || {};
  return {
    ...user,
    partnerType,
    agencyName: user.agencyName || user.franchiseName || user.organization || user.name || '',
    agencyCode: user.agencyCode || user.franchiseCode || '',
    agencyOnboarding: onboarding,
    operatingModel: (user.operatingModel || 'single_outlet').replace('master_franchise', 'master_agency'),
  };
}

export function migrateFranchiseToAgency(store) {
  let changed = false;
  store.users.forEach((u) => {
    if (u.partnerType === 'franchise') {
      u.partnerType = 'agency';
      changed = true;
    }
    if (u.franchiseName && !u.agencyName) { u.agencyName = u.franchiseName; changed = true; }
    if (u.franchiseCode && !u.agencyCode) { u.agencyCode = u.franchiseCode; changed = true; }
    if (u.franchiseOnboarding && !u.agencyOnboarding) {
      u.agencyOnboarding = u.franchiseOnboarding;
      changed = true;
    }
    if (u.operatingModel === 'master_franchise') {
      u.operatingModel = 'master_agency';
      changed = true;
    }
  });
  return changed;
}

export function agencyTierTarget(tier) {
  return AGENCY_INVESTMENT_TIERS[tier]?.leadTarget || 30;
}
