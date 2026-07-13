/** Staff portal — tab registry and page metadata */

export const STAFF_PAGE_TITLES = {
  overview: { title: 'Home', desc: 'Your daily overview' },
  leads: { title: 'My Leads', desc: 'Leads assigned to you' },
  pending: { title: 'Pending', desc: 'Assessments awaiting action' },
  students: { title: 'Students', desc: 'Student pipeline' },
  'follow-ups': { title: 'Follow-ups', desc: 'Overdue and upcoming' },
  tasks: { title: 'Tasks', desc: 'Your task list' },
  calls: { title: 'Call Log', desc: 'Log sales calls' },
  sessions: { title: 'Sessions', desc: 'Counselling sessions' },
  notes: { title: 'Session Notes', desc: 'Counselling notes' },
  history: { title: 'History', desc: 'Past sessions' },
  generate: { title: 'Generate Reports', desc: 'Create assessment reports' },
  review: { title: 'Review', desc: 'Review pending reports' },
  upload: { title: 'Upload', desc: 'Upload report files' },
  delivery: { title: 'Delivery', desc: 'Deliver reports to students' },
  brain: { title: 'Brain Mapping', desc: 'Brain mapping reports' },
  skill: { title: 'Skill Assessment', desc: 'Skill assessment reports' },
};

export const STAFF_PLACEHOLDER_TABS = [
  'whatsapp', 'email', 'payments', 'calendar', 'recommendations', 'action-plan',
];

export function resolveStaffRoute(searchParams) {
  const tab = searchParams.get('tab') || 'overview';
  return { tab, pageInfo: STAFF_PAGE_TITLES[tab] || { title: tab.replace(/-/g, ' '), desc: '' } };
}

export function isStaffPlaceholderTab(tab) {
  return STAFF_PLACEHOLDER_TABS.includes(tab);
}
