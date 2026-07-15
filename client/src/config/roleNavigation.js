import {
  LayoutDashboard, Users, ClipboardList, IndianRupee, BarChart3, Settings,
  UsersRound, Shield, Building2, Briefcase, Calendar, MessageSquare, Wrench,
} from 'lucide-react';

/** Flat sidebar — every section visible, no hidden menus */
export const SUPER_ADMIN_NAV = [
  { tab: 'overview', label: 'Home', icon: LayoutDashboard },
  { tab: 'leads', label: 'Leads', icon: ClipboardList },
  { tab: 'partners', label: 'Partners', icon: UsersRound },
  { tab: 'students', label: 'Students', icon: Users },
  { tab: 'finance', label: 'Money', icon: IndianRupee },
  { tab: 'reports', label: 'Reports', icon: BarChart3 },
  { tab: 'team', label: 'Team', icon: Shield },
  { tab: 'messages', label: 'Messages', icon: MessageSquare },
  { tab: 'tools', label: 'Tools & Data', icon: Wrench },
  { tab: 'settings', label: 'Settings', icon: Settings },
];

export const ADMIN_OPS_NAV = [
  { tab: 'overview', label: 'Home', icon: LayoutDashboard },
  { tab: 'leads', label: 'Leads', icon: ClipboardList },
  { tab: 'partners', label: 'Partners', icon: UsersRound },
  { tab: 'students', label: 'Students', icon: Users },
  { tab: 'finance', label: 'Money', icon: IndianRupee },
  { tab: 'reports', label: 'Reports', icon: BarChart3 },
  { tab: 'messages', label: 'Messages', icon: MessageSquare },
  { tab: 'tools', label: 'Tools & Data', icon: Wrench },
  { tab: 'settings', label: 'Settings', icon: Settings },
];

export const SALES_NAV = [
  { to: '/staff', label: 'Home', icon: LayoutDashboard, end: true, tab: 'overview' },
  { to: '/staff?tab=leads', label: 'My Leads', icon: ClipboardList, tab: 'leads' },
  { to: '/staff?tab=follow-ups', label: 'Follow-ups', icon: Calendar, tab: 'follow-ups' },
  { to: '/staff?tab=students', label: 'Students', icon: Users, tab: 'students' },
];

export const COUNSELLOR_NAV = [
  { to: '/staff', label: 'Home', icon: LayoutDashboard, end: true, tab: 'overview' },
  { to: '/staff?tab=students', label: 'Students', icon: Users, tab: 'students' },
  { to: '/staff?tab=sessions', label: 'Sessions', icon: Briefcase, tab: 'sessions' },
  { to: '/staff?tab=follow-ups', label: 'Follow-ups', icon: Calendar, tab: 'follow-ups' },
];

export const REPORTS_NAV = [
  { to: '/staff', label: 'Home', icon: LayoutDashboard, end: true, tab: 'overview' },
  { to: '/staff?tab=pending', label: 'Pending', icon: ClipboardList, tab: 'pending' },
  { to: '/staff?tab=generate', label: 'Reports', icon: BarChart3, tab: 'generate' },
];

export const PARTNER_NAV = [
  { to: '/partner', label: 'Home', icon: LayoutDashboard, end: true, tab: 'overview' },
  { to: '/partner?tab=leads', label: 'My Leads', icon: ClipboardList, tab: 'leads' },
  { to: '/partner?tab=money', label: 'Earnings', icon: IndianRupee, tab: 'money' },
];

export const AGENCY_EXTRA_NAV = [
  { to: '/partner?tab=agency-hub', label: 'Agency Hub', icon: Building2, tab: 'agency-hub' },
];

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin / Operations',
  sales_executive: 'Sales Executive',
  counsellor: 'Counsellor',
  report_management: 'Report Management',
  partner: 'Partner / Agency',
};

export const AGENCY_TYPES = ['agency', 'school', 'college', 'coaching_center', 'corporate', 'university'];

export function getNavForRole(role, partnerType) {
  switch (role) {
    case 'super_admin':
      return SUPER_ADMIN_NAV;
    case 'admin':
      return ADMIN_OPS_NAV;
    case 'sales_executive':
      return SALES_NAV;
    case 'counsellor':
      return COUNSELLOR_NAV;
    case 'report_management':
      return REPORTS_NAV;
    case 'partner': {
      const isAgency = AGENCY_TYPES.includes(partnerType);
      if (isAgency) return [PARTNER_NAV[0], AGENCY_EXTRA_NAV[0], ...PARTNER_NAV.slice(1)];
      return PARTNER_NAV;
    }
    default:
      return PARTNER_NAV;
  }
}

export function getDashboardPath(role) {
  if (role === 'super_admin' || role === 'admin') return '/admin';
  if (['sales_executive', 'counsellor', 'report_management'].includes(role)) return '/staff';
  return '/partner';
}

export function getDashboardTitle(role, partnerType) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Operations';
  if (role === 'sales_executive') return 'Sales';
  if (role === 'counsellor') return 'Counsellor';
  if (role === 'report_management') return 'Reports';
  if (AGENCY_TYPES.includes(partnerType)) return 'Agency Portal';
  return 'Partner Portal';
}
