/** Partner portal — tab registry, routing, and page metadata */

export const PARTNER_TAB_ALIASES = {
  'add-lead': { tab: 'leads', openLeadModal: true },
  commissions: { tab: 'money' },
  payout: { tab: 'money' },
  franchise: { tab: 'agency-hub' },
};

export const PARTNER_PAGE_TITLES = {
  overview: { title: 'Home', desc: 'Your dashboard and quick actions' },
  leads: { title: 'My Leads', desc: 'Submit and track your referrals' },
  money: { title: 'Earnings', desc: 'Commissions and payout details' },
  'agency-hub': { title: 'Agency Hub', desc: 'Team, territory and onboarding' },
  profile: { title: 'My Profile', desc: 'Update your contact details' },
  password: { title: 'Change Password', desc: 'Update your login password' },
  reports: { title: 'Reports', desc: 'Performance analytics' },
  leaderboard: { title: 'Leaderboard', desc: 'Partner rankings' },
  'follow-ups': { title: 'Follow-ups', desc: 'Upcoming and overdue reminders' },
  bulk: { title: 'Bulk Import', desc: 'Upload multiple leads at once' },
  messages: { title: 'Messages', desc: 'Chat with admin team' },
  notifications: { title: 'Notifications', desc: 'Alerts and updates' },
  marketing: { title: 'Marketing Kit', desc: 'Brochures and social templates' },
  training: { title: 'Training', desc: 'Product and sales resources' },
  support: { title: 'Support', desc: 'Get help from our team' },
  wallet: { title: 'Wallet', desc: 'Balance and transaction history' },
  students: { title: 'Students', desc: 'Converted student records' },
  team: { title: 'Agency Team', desc: 'Manage sub-partners' },
  performance: { title: 'Performance', desc: 'Agency KPIs and trends' },
  revenue: { title: 'Revenue', desc: 'Agency revenue breakdown' },
};

/** Grouped quick links shown on Home */
export const PARTNER_TAB_GROUPS = [
  {
    id: 'work',
    label: 'Daily Work',
    tabs: [
      { tab: 'leads', label: 'My Leads' },
      { tab: 'money', label: 'Earnings' },
      { tab: 'follow-ups', label: 'Follow-ups' },
      { tab: 'bulk', label: 'Bulk Import' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    tabs: [
      { tab: 'reports', label: 'Reports' },
      { tab: 'leaderboard', label: 'Leaderboard' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    tabs: [
      { tab: 'profile', label: 'Profile' },
      { tab: 'password', label: 'Password' },
      { tab: 'notifications', label: 'Notifications' },
      { tab: 'messages', label: 'Messages' },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    tabs: [
      { tab: 'marketing', label: 'Marketing Kit' },
      { tab: 'training', label: 'Training' },
      { tab: 'support', label: 'Support' },
    ],
  },
];

export const PARTNER_AGENCY_GROUPS = [
  {
    id: 'agency',
    label: 'Agency',
    tabs: [
      { tab: 'agency-hub', label: 'Agency Hub' },
      { tab: 'team', label: 'Team' },
      { tab: 'performance', label: 'Performance' },
      { tab: 'revenue', label: 'Revenue' },
    ],
  },
];

export function resolvePartnerRoute(searchParams) {
  const rawTab = searchParams.get('tab') || 'overview';
  const alias = PARTNER_TAB_ALIASES[rawTab];
  const tab = alias?.tab || rawTab;
  return { rawTab, tab, alias, pageInfo: PARTNER_PAGE_TITLES[tab] || { title: tab, desc: '' } };
}

export function getPartnerGroups(isAgency) {
  return isAgency ? [...PARTNER_TAB_GROUPS, ...PARTNER_AGENCY_GROUPS] : PARTNER_TAB_GROUPS;
}
