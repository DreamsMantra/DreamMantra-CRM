/** Dream Mantra CRM — roles, permissions, and business constants */

export const USER_ROLES = [
  'super_admin',
  'admin',
  'sales_executive',
  'counsellor',
  'report_management',
  'partner',
];

export const STAFF_ROLES = ['super_admin', 'admin', 'sales_executive', 'counsellor', 'report_management'];

/** Staff roles editable in roles UI (excludes partner) */
export const EDITABLE_STAFF_ROLES = ['super_admin', 'admin', 'sales_executive', 'counsellor', 'report_management'];

export const LEAD_TYPES = ['student', 'business'];

export const ADMIN_ROLES = ['super_admin', 'admin'];

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin / Operations',
  sales_executive: 'Sales Executive',
  counsellor: 'Counsellor',
  report_management: 'Report Management',
  partner: 'Partner / Agency',
};

/** Default permissions per role — super_admin can override per user */
/** All permission keys for enterprise CRM */
export const ALL_PERMISSIONS = [
  'dashboard.view', 'leads.view', 'leads.edit', 'leads.assign', 'leads.delete', 'leads.own',
  'students.view', 'students.edit', 'students.assign',
  'partners.view', 'partners.edit', 'partners.approve', 'partners.delete',
  'agencies.view', 'agencies.edit',
  'tasks.view', 'tasks.edit', 'tasks.assign',
  'calendar.view', 'calendar.edit',
  'reports.view', 'reports.edit', 'reports.generate', 'reports.upload',
  'payments.view', 'payments.edit',
  'payouts.view', 'payouts.approve',
  'commissions.view', 'commissions.edit',
  'automations.view', 'automations.edit',
  'users.view', 'users.edit', 'users.delete',
  'roles.view', 'roles.edit',
  'settings.view', 'settings.edit',
  'audit.view',
  'notifications.send', 'messages.send',
  'followups.view', 'followups.edit', 'calls.view', 'calls.edit',
  'counselling.view', 'counselling.edit', 'sessions.view', 'sessions.edit',
  'assessments.view', 'assessments.edit',
  'payout.request', 'leads.create', 'commissions.view',
];

export const DEFAULT_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'dashboard.view', 'leads.view', 'leads.edit', 'leads.assign', 'students.view', 'students.edit',
    'partners.view', 'partners.approve', 'agencies.view', 'tasks.view', 'tasks.edit', 'calendar.view',
    'reports.view', 'payments.view', 'payouts.view', 'notifications.send', 'messages.send',
  ],
  sales_executive: [
    'dashboard.view', 'leads.view', 'leads.edit', 'leads.own', 'followups.view', 'followups.edit',
    'calls.view', 'calls.edit', 'students.view', 'payments.view', 'tasks.view', 'calendar.view',
  ],
  counsellor: [
    'dashboard.view', 'students.view', 'students.edit', 'sessions.view', 'sessions.edit',
    'counselling.view', 'counselling.edit', 'followups.view',
  ],
  report_management: [
    'dashboard.view', 'reports.view', 'reports.edit', 'reports.generate', 'reports.upload',
    'assessments.view', 'assessments.edit',
  ],
  partner: [
    'dashboard.view', 'leads.view', 'leads.create', 'commissions.view', 'payout.request',
  ],
};

export const LEAD_STATUSES = [
  'new', 'contacted', 'interested', 'follow_up', 'counselling_booked',
  'payment_pending', 'payment_done', 'assessment_pending', 'report_under_process',
  'report_ready', 'report_delivered', 'completed', 'lost',
];

export const LEAD_STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  follow_up: 'Follow-up',
  counselling_booked: 'Counselling Booked',
  payment_pending: 'Payment Pending',
  payment_done: 'Payment Done',
  assessment_pending: 'Assessment Pending',
  report_under_process: 'Report Under Process',
  report_ready: 'Report Ready',
  report_delivered: 'Report Delivered',
  completed: 'Completed',
  lost: 'Lost',
};

/** Legacy status mapping for existing leads */
export const LEGACY_STATUS_MAP = {
  counselling_scheduled: 'counselling_booked',
  assessment_done: 'assessment_pending',
  converted: 'completed',
  on_hold: 'follow_up',
};

export const PRODUCTS = [
  { id: 'brain_mapping', label: 'Brain Mapping', defaultCommission: { type: 'fixed', value: 200 } },
  { id: 'skill_mapping', label: 'Skill Mapping', defaultCommission: { type: 'fixed', value: 100 } },
  { id: 'ai_career_launchpad', label: 'AI Career Launchpad', defaultCommission: { type: 'percentage', value: 10 } },
  { id: 'counselling', label: 'Counselling', defaultCommission: { type: 'percentage', value: 15 } },
];

export const PARTNER_CATEGORIES = {
  internal: [{ value: 'dream_mantra', label: 'Dream Mantra (Internal)' }],
  individual: [
    { value: 'teacher', label: 'Teacher' },
    { value: 'career_counsellor', label: 'Career Counsellor' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'parent_ambassador', label: 'Parent Ambassador' },
    { value: 'alumni', label: 'Alumni' },
    { value: 'student_ambassador', label: 'Student Ambassador' },
    { value: 'psychologist', label: 'Psychologist' },
    { value: 'influencer', label: 'Influencer' },
    { value: 'education_consultant', label: 'Education Consultant' },
    { value: 'referral_partner', label: 'Referral Partner' },
    { value: 'counsellor', label: 'Counsellor (Partner)' },
  ],
  organization: [
    { value: 'school', label: 'School' },
    { value: 'coaching_center', label: 'Coaching Institute' },
    { value: 'college', label: 'College' },
    { value: 'university', label: 'University' },
    { value: 'agency', label: 'Agency' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'ngo', label: 'NGO' },
    { value: 'csr_partner', label: 'CSR Partner' },
    { value: 'training_partner', label: 'Training Partner' },
    { value: 'placement_partner', label: 'Placement Partner' },
  ],
};

export const ALL_PARTNER_TYPES = [
  ...PARTNER_CATEGORIES.internal,
  ...PARTNER_CATEGORIES.individual,
  ...PARTNER_CATEGORIES.organization,
];

export const AGENCY_TYPES = ['agency', 'school', 'college', 'coaching_center', 'corporate', 'university'];

export function isAgencyType(partnerType) {
  return AGENCY_TYPES.includes(partnerType);
}

export function normalizeRole(role) {
  if (role === 'admin' && !USER_ROLES.includes(role)) return 'super_admin';
  return role || 'partner';
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function isAdminRole(role) {
  return role === 'super_admin' || role === 'admin';
}

export function isSuperAdmin(role) {
  return role === 'super_admin';
}

export function getDefaultPermissions(role) {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.partner;
}

export function resolveRolePermissions(role, customMap = {}) {
  if (role === 'super_admin') return ['*'];
  const custom = customMap[role];
  if (Array.isArray(custom) && custom.length) return custom;
  return getDefaultPermissions(role);
}

export function userHasPermission(user, permission) {
  const perms = user?.permissions?.length ? user.permissions : getDefaultPermissions(user?.role);
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function normalizeLeadStatus(status) {
  return LEGACY_STATUS_MAP[status] || status;
}

export function dashboardPathForRole(role) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'sales_executive':
    case 'counsellor':
    case 'report_management':
      return '/staff';
    case 'partner':
    default:
      return '/partner';
  }
}
