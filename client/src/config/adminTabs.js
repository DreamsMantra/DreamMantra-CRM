/** Lead segment: B2C students vs B2B business */

export const ADMIN_TAB_IDS = ['overview', 'leads', 'partners', 'students', 'finance', 'reports', 'team', 'messages', 'tools', 'settings'];

export const LEAD_TYPES = [

  { value: 'student', label: 'Students (B2C)', short: 'Students (B2C)' },

  { value: 'business', label: 'Partners (B2B)', short: 'Partners (B2B)' },

];



export const BUSINESS_TYPES = [

  { value: 'school', label: 'School' },

  { value: 'college', label: 'College' },

  { value: 'coaching_center', label: 'Coaching Institute' },

  { value: 'corporate', label: 'Corporate' },

  { value: 'ngo', label: 'NGO / CSR' },

  { value: 'agency', label: 'Agency Partner' },

  { value: 'other', label: 'Other Organization' },

];



export function leadTypeLabel(type) {

  return LEAD_TYPES.find((t) => t.value === type)?.label || (type === 'business' ? 'Partners (B2B)' : 'Students (B2C)');

}



export function leadDisplayName(lead) {

  if (lead?.leadType === 'business') return lead.companyName || lead.studentName || '—';

  return lead?.studentName || '—';

}



export function leadDisplayPhone(lead) {

  if (lead?.leadType === 'business') return lead.contactPhone || lead.studentPhone || '—';

  return lead?.studentPhone || '—';

}



/** Old URL → new flat tabs */

export const ADMIN_TAB_ALIASES = {

  kanban: { tab: 'leads', view: 'board' },

  'follow-ups': { tab: 'leads', panel: 'followups' },

  duplicates: { tab: 'leads', panel: 'duplicates' },

  pipeline: { tab: 'leads' },

  b2c: { tab: 'leads', leadType: 'student' },

  b2b: { tab: 'leads', leadType: 'business' },

  board: { tab: 'leads', view: 'board' },

  followups: { tab: 'leads', panel: 'followups' },

  agencies: { tab: 'partners', partnerType: 'agency' },

  franchises: { tab: 'partners', partnerType: 'agency' },

  more: { tab: 'overview' },

  operations: { tab: 'team', inner: 'tasks' },

  tasks: { tab: 'team', inner: 'tasks' },

  calendar: { tab: 'team', inner: 'calendar' },

  messages: { tab: 'messages' },

  users: { tab: 'team', inner: 'users' },

  roles: { tab: 'team', inner: 'roles' },

  assignments: { tab: 'team', inner: 'assignments' },

  commissions: { tab: 'finance', sub: 'commissions' },

  payments: { tab: 'finance', sub: 'payments' },

  payouts: { tab: 'finance', sub: 'payouts' },

  products: { tab: 'settings', inner: 'pricing' },

  pricing: { tab: 'settings', inner: 'pricing' },

  master: { tab: 'tools' },

  data: { tab: 'tools' },

  tools: { tab: 'tools' },

  automations: { tab: 'tools' },

  audit: { tab: 'tools' },

  notify: { tab: 'settings', inner: 'general' },

  announcements: { tab: 'settings', inner: 'general' },

  activity: { tab: 'overview' },

  crm: { tab: 'settings', inner: 'general' },

};



export const ADMIN_SUB_TABS = {

  finance: [

    { id: 'commissions', label: 'Commissions' },

    { id: 'payments', label: 'Payments' },

    { id: 'payouts', label: 'Payouts' },

  ],

  team: [

    { id: 'users', label: 'Users' },

    { id: 'roles', label: 'Roles' },

    { id: 'assignments', label: 'Assignments' },

    { id: 'tasks', label: 'Tasks' },

    { id: 'calendar', label: 'Calendar' },

  ],

  settings: [

    { id: 'general', label: 'General' },

    { id: 'pricing', label: 'Pricing' },

  ],

};



export const PAGE_TITLES = {

  overview: { title: 'Home', desc: 'Quick actions and today\'s overview' },

  leads: { title: 'Leads', desc: 'All student & business leads' },

  partners: { title: 'Partners', desc: 'Partner accounts and agencies' },

  students: { title: 'Students', desc: 'Enrolled students and counselling' },

  finance: { title: 'Money', desc: 'Commissions, payments and payouts' },

  reports: { title: 'Reports', desc: 'Analytics and conversion trends' },

  team: { title: 'Team', desc: 'Users, roles, tasks and calendar' },

  messages: { title: 'Messages', desc: 'Chat with partners and team' },

  tools: { title: 'Tools & Data', desc: 'Forms, import/export, resources, automations and audit log' },

  settings: { title: 'Settings', desc: 'CRM configuration and pricing' },

};



/** Resolve tab/sub/inner from URL + aliases (works on first render) */

export function resolveAdminRoute(searchParams) {

  const rawTab = searchParams.get('tab') || 'overview';

  const alias = ADMIN_TAB_ALIASES[rawTab];

  const tab = alias?.tab || rawTab;



  let sub = searchParams.get('sub');

  let inner = searchParams.get('inner');



  if (alias?.sub) sub = alias.sub;
  if (alias?.inner) inner = alias.inner;

  if (tab === 'finance' && !sub) sub = 'commissions';

  if (tab === 'team' && !inner) inner = 'users';

  if (tab === 'settings' && !inner) inner = 'general';



  return { rawTab, tab, sub, inner, alias };

}
