const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('crm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/health'),

  auth: {
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    formTemplate: (name) => request(`/auth/forms/${name}`),
    me: () => request('/auth/me'),
    updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
    changePassword: (body) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
  },

  partner: {
    dashboard: () => request('/partner/dashboard'),
    leads: (params = {}) => request(`/partner/leads?${new URLSearchParams(params)}`),
    createLead: (body) => request('/partner/leads', { method: 'POST', body: JSON.stringify(body) }),
    updateLead: (id, body) => request(`/partner/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    getLead: (id) => request(`/partner/leads/${id}`),
    checkDuplicate: (phone) => request('/partner/leads/check-duplicate', { method: 'POST', body: JSON.stringify({ phone }) }),
    bulkLeads: (leads) => request('/partner/leads/bulk', { method: 'POST', body: JSON.stringify({ leads }) }),
    leadComments: (id) => request(`/partner/leads/${id}/comments`),
    addComment: (id, message) => request(`/partner/leads/${id}/comments`, { method: 'POST', body: JSON.stringify({ message }) }),
    commissions: () => request('/partner/commissions'),
    notifications: () => request('/partner/notifications'),
    markRead: (id) => request(`/partner/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/partner/notifications/read-all', { method: 'PATCH' }),
    reports: () => request('/partner/reports'),
    leaderboard: () => request('/partner/leaderboard'),
    followUps: () => request('/partner/follow-ups'),
    announcements: () => request('/partner/announcements'),
    exportLeads: (params = {}) => `/api/partner/export/leads?${new URLSearchParams(params)}`,
    payoutDetails: (body) => request('/partner/payout-details', { method: 'PUT', body: JSON.stringify(body) }),
    dismissWelcome: () => request('/partner/welcome-seen', { method: 'PATCH' }),
    franchiseHub: () => request('/partner/franchise-hub'),
    agencyHub: () => request('/partner/agency-hub'),
    updateFranchiseOnboarding: (body) => request('/partner/franchise-onboarding', { method: 'PATCH', body: JSON.stringify(body) }),
    updateAgencyOnboarding: (body) => request('/partner/agency-onboarding', { method: 'PATCH', body: JSON.stringify(body) }),
    payoutRequests: () => request('/partner/payout-requests'),
    createPayoutRequest: (body) => request('/partner/payout-request', { method: 'POST', body: JSON.stringify(body) }),
  },

  admin: {
    dashboard: () => request('/admin/dashboard'),
    search: (q) => request(`/admin/search?q=${encodeURIComponent(q)}`),
    franchises: () => request('/admin/franchises'),
    agencies: () => request('/admin/agencies'),
    system: () => request('/admin/system'),
    duplicates: () => request('/admin/duplicates'),

    partners: (params = {}) => request(`/admin/partners?${new URLSearchParams(params)}`),
    getPartner: (id) => request(`/admin/partners/${id}`),
    createPartner: (body) => request('/admin/partners', { method: 'POST', body: JSON.stringify(body) }),
    updatePartner: (id, body) => request(`/admin/partners/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deletePartner: (id) => request(`/admin/partners/${id}`, { method: 'DELETE' }),
    resetPartnerPassword: (id, password) => request(`/admin/partners/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
    recalculatePartner: (id) => request(`/admin/partners/${id}/recalculate`, { method: 'POST' }),
    bulkPartners: (ids, action, data) => request('/admin/partners/bulk', { method: 'POST', body: JSON.stringify({ ids, action, data }) }),

    leads: (params = {}) => request(`/admin/leads?${new URLSearchParams(params)}`),
    createLead: (body) => request('/admin/leads', { method: 'POST', body: JSON.stringify(body) }),
    updateLead: (id, body) => request(`/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    editLead: (id, body) => request(`/admin/leads/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteLead: (id) => request(`/admin/leads/${id}`, { method: 'DELETE' }),
    transferLead: (id, partnerId) => request(`/admin/leads/${id}/transfer`, { method: 'POST', body: JSON.stringify({ partnerId }) }),
    bulkLeadAction: (body) => request('/admin/leads/bulk-action', { method: 'POST', body: JSON.stringify(body) }),
    bulkLeads: (partnerId, leads) => request('/admin/leads/bulk', { method: 'POST', body: JSON.stringify({ partnerId, leads }) }),
    leadComments: (id) => request(`/admin/leads/${id}/comments`),
    addComment: (id, message, isInternal) => request(`/admin/leads/${id}/comments`, { method: 'POST', body: JSON.stringify({ message, isInternal }) }),

    commissions: (params = {}) => request(`/admin/commissions?${new URLSearchParams(params)}`),
    createCommission: (body) => request('/admin/commissions', { method: 'POST', body: JSON.stringify(body) }),
    updateCommission: (id, body) => request(`/admin/commissions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteCommission: (id) => request(`/admin/commissions/${id}`, { method: 'DELETE' }),
    bulkCommissionAction: (ids, status) => request('/admin/commissions/bulk-action', { method: 'POST', body: JSON.stringify({ ids, status }) }),

    meta: () => request('/admin/meta'),
    reports: () => request('/admin/reports'),
    activity: (limit = 50) => request(`/admin/activity?limit=${limit}`),
    followUps: () => request('/admin/follow-ups'),

    announcements: () => request('/admin/announcements'),
    createAnnouncement: (body) => request('/admin/announcements', { method: 'POST', body: JSON.stringify(body) }),
    updateAnnouncement: (id, body) => request(`/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteAnnouncement: (id) => request(`/admin/announcements/${id}`, { method: 'DELETE' }),

    notify: (body) => request('/admin/notify', { method: 'POST', body: JSON.stringify(body) }),
    settings: () => request('/admin/settings'),
    updateSettings: (body) => request('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),

    exportLeads: (params = {}) => `/api/admin/export/leads?${new URLSearchParams(params)}`,
    exportPartners: () => '/api/admin/export/partners',
    exportCommissions: () => '/api/admin/export/commissions',
    exportRegistrations: (status = 'all') => `/api/admin/export/registrations?status=${status}`,
    exportActivities: () => '/api/admin/export/activities',
    exportAnnouncements: () => '/api/admin/export/announcements',
    exportBackup: () => '/api/admin/export/backup',

    getForms: () => request('/admin/forms'),
    updateForms: (templates) => request('/admin/forms', { method: 'PUT', body: JSON.stringify({ templates }) }),
    registrations: (status = 'all') => request(`/admin/registrations?status=${status}`),
    updateRegistration: (id, body) => request(`/admin/registrations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteRegistration: (id) => request(`/admin/registrations/${id}`, { method: 'DELETE' }),
    allComments: () => request('/admin/comments'),
    updateComment: (id, body) => request(`/admin/comments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteComment: (id) => request(`/admin/comments/${id}`, { method: 'DELETE' }),
    allNotifications: () => request('/admin/notifications'),
    deleteNotification: (id) => request(`/admin/notifications/${id}`, { method: 'DELETE' }),
    clearActivities: () => request('/admin/activities', { method: 'DELETE' }),
    createCustomForm: (body) => request('/admin/forms/custom', { method: 'POST', body: JSON.stringify(body) }),
    deleteCustomForm: (id) => request(`/admin/forms/custom/${id}`, { method: 'DELETE' }),

    students: () => request('/admin/students'),
    users: (params = {}) => request(`/admin/users?${new URLSearchParams(params)}`),
    createUser: (body) => request('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    roles: () => request('/admin/roles'),
    updateRoles: (rolePermissions) => request('/admin/roles', { method: 'PUT', body: JSON.stringify({ rolePermissions }) }),
    products: () => request('/admin/products'),
    updateProducts: (products) => request('/admin/products', { method: 'PUT', body: JSON.stringify({ products }) }),
    tasks: () => request('/admin/tasks'),
    createTask: (body) => request('/admin/tasks', { method: 'POST', body: JSON.stringify(body) }),
    updateTask: (id, body) => request(`/admin/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteTask: (id) => request(`/admin/tasks/${id}`, { method: 'DELETE' }),

    payments: (params = {}) => request(`/admin/payments?${new URLSearchParams(params)}`),
    createPayment: (body) => request('/admin/payments', { method: 'POST', body: JSON.stringify(body) }),
    updatePayment: (id, body) => request(`/admin/payments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    payoutRequests: (params = {}) => request(`/admin/payout-requests?${new URLSearchParams(params)}`),
    updatePayoutRequest: (id, body) => request(`/admin/payout-requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    automations: () => request('/admin/automations'),
    createAutomation: (body) => request('/admin/automations', { method: 'POST', body: JSON.stringify(body) }),
    updateAutomation: (id, body) => request(`/admin/automations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteAutomation: (id) => request(`/admin/automations/${id}`, { method: 'DELETE' }),

    auditLog: (limit = 100) => request(`/admin/audit-log?limit=${limit}`),
    calendar: (params = {}) => request(`/admin/calendar?${new URLSearchParams(params)}`),
    enterprise: () => request('/admin/enterprise'),
    teamMembers: (agencyId) => request(`/admin/team-members?agencyId=${agencyId || ''}`),
    createTeamMember: (body) => request('/admin/team-members', { method: 'POST', body: JSON.stringify(body) }),
    deleteTeamMember: (id) => request(`/admin/team-members/${id}`, { method: 'DELETE' }),
  },

  staff: {
    dashboard: () => request('/staff/dashboard'),
    leads: (params = {}) => request(`/staff/leads?${new URLSearchParams(params)}`),
    students: () => request('/staff/students'),
    tasks: () => request('/staff/tasks'),
    createTask: (body) => request('/staff/tasks', { method: 'POST', body: JSON.stringify(body) }),
    sessions: () => request('/staff/sessions'),
    createSession: (body) => request('/staff/sessions', { method: 'POST', body: JSON.stringify(body) }),
    reports: () => request('/staff/reports'),
    createReport: (body) => request('/staff/reports', { method: 'POST', body: JSON.stringify(body) }),
    calls: () => request('/staff/calls'),
    createCall: (body) => request('/staff/calls', { method: 'POST', body: JSON.stringify(body) }),
    followUps: () => request('/staff/follow-ups'),
    updateLead: (id, body) => request(`/staff/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },

  messages: {
    inbox: () => request('/messages/inbox'),
    thread: (otherUserId) => request(otherUserId ? `/messages/thread/${otherUserId}` : '/messages/thread'),
    send: async ({ recipientId, message, file }) => {
      const token = localStorage.getItem('crm_token');
      const fd = new FormData();
      if (recipientId) fd.append('recipientId', recipientId);
      if (message) fd.append('message', message);
      if (file) fd.append('file', file);
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Send failed');
      return data;
    },
    markRead: (otherUserId) => request(`/messages/read/${otherUserId}`, { method: 'PATCH' }),
  },
};
