import bcrypt from 'bcryptjs';
import { loadStore, saveStore, newId, now, findById, sortByDate } from '../lib/store.js';
import { DEFAULT_FORM_TEMPLATES } from '../data/formDefaults.js';
import { STAFF_ROLES, EDITABLE_STAFF_ROLES, USER_ROLES, getDefaultPermissions, isStaffRole, normalizeLeadStatus } from './roles.js';
import { normalizeAgencyUser, isAgencyPartner, agencyTierTarget, AGENCY_ONBOARDING_KEYS } from './agency.js';
import { generateLoginId, normalizeLoginId, generateReferralCode, generateLeadId } from '../utils/ids.js';

export const PARTNER_TIERS = ['bronze', 'silver', 'gold', 'platinum'];

export const PARTNER_TYPES = [
  'referral_partner', 'teacher', 'school', 'college', 'coaching_center', 'influencer', 'counsellor', 'agency',
];

export function userToSafeJSON(user) {
  const { password, ...safe } = user;
  return { ...safe, id: user.id };
}

export function getUsers() {
  return loadStore().users;
}

export function findUser(query) {
  const users = getUsers();
  if (query.email) return users.find((u) => u.email === query.email.toLowerCase()) || null;
  if (query.loginId) {
    const lid = normalizeLoginId(query.loginId);
    return users.find((u) => u.loginId && normalizeLoginId(u.loginId) === lid) || null;
  }
  if (query.id) return findById(users, query.id);
  if (query.referralCode) return users.find((u) => u.referralCode === query.referralCode) || null;
  if (query.role === 'admin') return users.find((u) => u.role === 'admin' || u.role === 'super_admin') || null;
  if (query.role === 'super_admin') return users.find((u) => u.role === 'super_admin') || null;
  if (query.role) return users.find((u) => u.role === query.role) || null;
  return null;
}

export function findUserByLoginIdentifier(identifier) {
  const raw = (identifier || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) {
    const byEmail = findUser({ email: raw.toLowerCase() });
    if (byEmail) return byEmail;
  }
  const byLoginId = findUser({ loginId: raw });
  if (byLoginId) return byLoginId;
  return findUser({ referralCode: raw.toUpperCase() });
}

export function ensurePartnerLoginIds() {
  const store = loadStore();
  let changed = false;
  store.users.forEach((u) => {
    if (u.role === 'partner' && !u.loginId) {
      let loginId = generateLoginId(u.partnerType || 'referral_partner');
      while (store.users.some((x) => x.loginId === loginId)) loginId = generateLoginId(u.partnerType);
      u.loginId = loginId;
      changed = true;
    }
  });
  if (changed) saveStore(store);
}

export function queryUsers(filter = {}) {
  let users = getUsers().filter((u) => u.role === 'partner');
  if (filter.status && filter.status !== 'all') users = users.filter((u) => u.status === filter.status);
  if (filter.partnerType && filter.partnerType !== 'all') users = users.filter((u) => u.partnerType === filter.partnerType);
  if (filter.search) {
    const q = filter.search;
    users = users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(q.toLowerCase()) ||
        (u.organization || '').toLowerCase().includes(q.toLowerCase()) ||
        (u.referralCode || '').toLowerCase().includes(q.toLowerCase()) ||
        (u.loginId || '').toLowerCase().includes(q.toLowerCase())
    );
  }
  return sortByDate(users);
}

export function globalSearch(query, limit = 12) {
  const q = (query || '').trim().toLowerCase();
  if (!q || q.length < 2) return { partners: [], leads: [] };
  const partners = queryUsers({ search: q })
    .slice(0, limit)
    .map((p) => userToSafeJSON(p));
  const leads = getLeads({ search: q })
    .slice(0, limit)
    .map((l) => populateLead(l));
  return { partners, leads };
}

export function createUser(data) {
  const store = loadStore();
  const loginId = data.loginId ? normalizeLoginId(data.loginId) : data.role === 'partner' ? generateLoginId(data.partnerType) : undefined;
  const user = {
    id: newId(),
    ...data,
    email: data.email.toLowerCase(),
    ...(loginId ? { loginId } : {}),
    totalLeads: 0,
    convertedLeads: 0,
    totalEarnings: 0,
    tier: data.tier || 'bronze',
    bankAccount: data.bankAccount || '',
    ifsc: data.ifsc || '',
    upiId: data.upiId || '',
    panNumber: data.panNumber || '',
    documentsVerified: false,
    agencyName: data.agencyName || data.franchiseName || '',
    territory: data.territory || '',
    outletCount: data.outletCount || 1,
    investmentTier: data.investmentTier || 'starter',
    agencyCode: data.agencyCode || data.franchiseCode || '',
    royaltyPercent: data.royaltyPercent ?? 8,
    operatingModel: data.operatingModel || 'single_outlet',
    agreementDate: data.agreementDate || '',
    agencyOnboarding: data.agencyOnboarding || data.franchiseOnboarding || {
      agreementSigned: false,
      trainingCompleted: false,
      brandingSetup: false,
      firstLeadSubmitted: false,
      payoutDetailsAdded: false,
      launchEventDone: false,
    },
    createdAt: now(),
    updatedAt: now(),
  };
  store.users.push(user);
  saveStore(store);
  return user;
}

export function updateUser(id, updates) {
  const store = loadStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  store.users[idx] = { ...store.users[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.users[idx];
}

export async function seedAdmin() {
  const users = getUsers();
  const email = (process.env.ADMIN_EMAIL || 'admin@dreammantra.in').toLowerCase();
  // Migrate away from legacy defaults even if old env still has them
  const rawPassword = process.env.ADMIN_PASSWORD;
  const legacyPasswords = ['Admin@123', 'DreamMantra@2026', 'Dreams.unlocked@2000'];
  const password = (!rawPassword || legacyPasswords.includes(rawPassword))
    ? 'Unlocked.dreams@2000'
    : rawPassword;
  const hash = await bcrypt.hash(password, 10);

  const legacyAdmin = users.find((u) => u.role === 'admin');
  if (legacyAdmin && legacyAdmin.role === 'admin') {
    updateUser(legacyAdmin.id, {
      role: 'super_admin',
      permissions: getDefaultPermissions('super_admin'),
      password: hash,
      email: email || legacyAdmin.email,
    });
    console.log(`✓ Upgraded admin to super_admin and synced password: ${legacyAdmin.email}`);
    return findUser({ id: legacyAdmin.id });
  }

  const existing = findUser({ role: 'super_admin' }) || findUser({ email });
  if (existing) {
    updateUser(existing.id, {
      password: hash,
      role: 'super_admin',
      status: 'active',
      permissions: getDefaultPermissions('super_admin'),
      ...(existing.email !== email ? { email } : {}),
    });
    console.log(`✓ Super Admin password synced: ${existing.email || email}`);
    return findUser({ id: existing.id });
  }

  const admin = createUser({
    name: process.env.ADMIN_NAME || 'Dream Mantra Super Admin',
    email,
    phone: '9680102276',
    password: hash,
    role: 'super_admin',
    status: 'active',
    permissions: getDefaultPermissions('super_admin'),
    referralCode: generateReferralCode('ADM'),
    partnerType: null,
  });
  console.log(`✓ Super Admin seeded: ${email}`);
  return admin;
}

export function getLeads(filter = {}) {
  let leads = loadStore().leads;
  if (filter.partnerId) leads = leads.filter((l) => l.partnerId === filter.partnerId);
  if (filter.agencyId) leads = leads.filter((l) => l.partnerId === filter.agencyId || l.agencyId === filter.agencyId);
  if (filter.project && filter.project !== 'all') {
    const q = String(filter.project).toLowerCase();
    leads = leads.filter((l) => (l.project || '').toLowerCase() === q || (l.projectId || '').toLowerCase() === q);
  }
  if (filter.projectId && filter.projectId !== 'all') {
    leads = leads.filter((l) => l.projectId === filter.projectId);
  }
  if (filter.status && filter.status !== 'all') leads = leads.filter((l) => l.status === filter.status);
  if (filter.priority && filter.priority !== 'all') leads = leads.filter((l) => l.priority === filter.priority);
  if (filter.city && filter.city !== 'all') leads = leads.filter((l) => (l.city || '').toLowerCase().includes(filter.city.toLowerCase()));
  if (filter.leadType && filter.leadType !== 'all') {
    leads = leads.filter((l) => (l.leadType || 'student') === filter.leadType);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    leads = leads.filter(
      (l) =>
        (l.studentName || '').toLowerCase().includes(q) ||
        (l.studentPhone || '').includes(q) ||
        (l.companyName || '').toLowerCase().includes(q) ||
        (l.contactPerson || '').toLowerCase().includes(q) ||
        (l.contactPhone || '').includes(q) ||
        (l.leadId || '').toLowerCase().includes(q) ||
        (l.partnerName || '').toLowerCase().includes(q) ||
        (l.project || '').toLowerCase().includes(q)
    );
  }
  return sortByDate(leads);
}

export function findLead(id) {
  return findById(loadStore().leads, id);
}

export function createLead(data) {
  const store = loadStore();
  const lead = {
    id: newId(),
    ...data,
    project: data.project != null ? data.project : null,
    projectId: data.projectId || null,
    createdAt: now(),
    updatedAt: now(),
  };
  store.leads.push(lead);
  saveStore(store);
  return lead;
}

export function updateLead(id, updates) {
  const store = loadStore();
  const idx = store.leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  store.leads[idx] = { ...store.leads[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.leads[idx];
}

export function getCommissions(filter = {}) {
  let items = loadStore().commissions;
  if (filter.partnerId) items = items.filter((c) => c.partnerId === filter.partnerId);
  if (filter.status && filter.status !== 'all') items = items.filter((c) => c.status === filter.status);
  return sortByDate(items);
}

export function createCommission(data) {
  const store = loadStore();
  const commission = { id: newId(), ...data, createdAt: now(), updatedAt: now() };
  store.commissions.push(commission);
  saveStore(store);
  return commission;
}

export function updateCommission(id, updates) {
  const store = loadStore();
  const idx = store.commissions.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  store.commissions[idx] = { ...store.commissions[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.commissions[idx];
}

export function getNotifications(userId) {
  return sortByDate(loadStore().notifications.filter((n) => n.userId === userId));
}

export function createNotification(data) {
  const store = loadStore();
  const notification = { id: newId(), read: false, ...data, createdAt: now() };
  store.notifications.push(notification);
  saveStore(store);
  return notification;
}

export function markNotificationRead(id, userId) {
  const store = loadStore();
  const n = store.notifications.find((x) => x.id === id && x.userId === userId);
  if (n) n.read = true;
  saveStore(store);
}

export function markAllNotificationsRead(userId) {
  const store = loadStore();
  store.notifications.forEach((n) => {
    if (n.userId === userId) n.read = true;
  });
  saveStore(store);
}

export function countUnreadNotifications(userId) {
  return loadStore().notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function populateLead(lead) {
  const partner = findUser({ id: lead.partnerId });
  return { ...lead, _id: lead.id, partner: partner ? userToSafeJSON(partner) : null };
}

export function populateCommission(c) {
  const partner = findUser({ id: c.partnerId });
  const lead = findLead(c.leadId);
  return {
    ...c,
    _id: c.id,
    partner: partner ? userToSafeJSON(partner) : null,
    lead: lead ? { ...lead, _id: lead.id } : null,
  };
}

// ─── Activities ───
export function logActivity({ userId, userName, action, entityType, entityId, details = '' }) {
  const store = loadStore();
  store.activities.unshift({
    id: newId(),
    userId,
    userName,
    action,
    entityType,
    entityId,
    details,
    createdAt: now(),
  });
  if (store.activities.length > 500) store.activities = store.activities.slice(0, 500);
  saveStore(store);
}

export function getActivities(limit = 50, filter = {}) {
  let items = loadStore().activities;
  if (filter.entityType) items = items.filter((a) => a.entityType === filter.entityType);
  if (filter.userId) items = items.filter((a) => a.userId === filter.userId);
  return items.slice(0, limit);
}

// ─── Announcements ───
export function getAnnouncements(activeOnly = true) {
  let items = sortByDate(loadStore().announcements);
  if (activeOnly) items = items.filter((a) => a.active !== false);
  return items;
}

export function createAnnouncement(data) {
  const store = loadStore();
  const item = { id: newId(), active: true, ...data, createdAt: now() };
  store.announcements.unshift(item);
  saveStore(store);
  return item;
}

export function updateAnnouncement(id, updates) {
  const store = loadStore();
  const idx = store.announcements.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  store.announcements[idx] = { ...store.announcements[idx], ...updates };
  saveStore(store);
  return store.announcements[idx];
}

// ─── Lead Comments ───
export function getLeadComments(leadId) {
  return sortByDate(loadStore().leadComments.filter((c) => c.leadId === leadId));
}

export function addLeadComment({ leadId, userId, userName, role, message, isInternal = false }) {
  const store = loadStore();
  const comment = { id: newId(), leadId, userId, userName, role, message, isInternal, createdAt: now() };
  store.leadComments.push(comment);
  saveStore(store);
  return comment;
}

export function getFormTemplates() {
  const settings = getSettings();
  const saved = settings.formTemplates || {};
  const merged = {};
  for (const [form, defaults] of Object.entries(DEFAULT_FORM_TEMPLATES)) {
    merged[form] = saved[form]?.length ? saved[form] : defaults.map((d) => ({ ...d }));
  }
  for (const custom of settings.customForms || []) {
    merged[custom.id] = saved[custom.id] || [];
  }
  return merged;
}

export function getFormsCatalog() {
  const builtins = [
    { id: 'registration', label: 'Registration Form', description: 'Partner signup / franchise application', builtin: true },
    { id: 'lead', label: 'Lead Submission Form', description: 'Student lead details form', builtin: true },
    { id: 'partnerProfile', label: 'Partner Profile Form', description: 'Partner profile & payout fields', builtin: true },
  ];
  const custom = (getSettings().customForms || []).map((c) => ({ ...c, label: c.name, builtin: false }));
  return [...builtins, ...custom];
}

export function createCustomForm({ name, description }) {
  const store = loadStore();
  if (!store.settings.customForms) store.settings.customForms = [];
  const id = `custom_${newId().slice(0, 8)}`;
  store.settings.customForms.push({ id, name: name.trim(), description: description?.trim() || '', createdAt: now() });
  if (!store.settings.formTemplates) store.settings.formTemplates = {};
  store.settings.formTemplates[id] = [];
  saveStore(store);
  return { id, name, description };
}

export function deleteCustomForm(formId) {
  if (['registration', 'lead', 'partnerProfile'].includes(formId)) return false;
  const store = loadStore();
  store.settings.customForms = (store.settings.customForms || []).filter((c) => c.id !== formId);
  if (store.settings.formTemplates) delete store.settings.formTemplates[formId];
  saveStore(store);
  return true;
}

export function updateFormTemplates(templates) {
  const store = loadStore();
  store.settings = { ...store.settings, formTemplates: templates };
  saveStore(store);
  return { templates: getFormTemplates(), catalog: getFormsCatalog() };
}

export function getRegistrations(filter = {}) {
  let users = getUsers().filter((u) => u.role === 'partner');
  if (filter.status && filter.status !== 'all') users = users.filter((u) => u.status === filter.status);
  return sortByDate(users.map(userToSafeJSON));
}

export function getAllComments() {
  return sortByDate(loadStore().leadComments).map((c) => {
    const lead = findLead(c.leadId);
    return { ...c, lead: lead ? { id: lead.id, leadId: lead.leadId, studentName: lead.studentName } : null };
  });
}

export function updateLeadComment(id, updates) {
  const store = loadStore();
  const idx = store.leadComments.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  store.leadComments[idx] = { ...store.leadComments[idx], ...updates };
  saveStore(store);
  return store.leadComments[idx];
}

export function deleteLeadComment(id) {
  const store = loadStore();
  const before = store.leadComments.length;
  store.leadComments = store.leadComments.filter((c) => c.id !== id);
  saveStore(store);
  return before !== store.leadComments.length;
}

export function getAllNotifications() {
  return sortByDate(loadStore().notifications).map((n) => {
    const user = findUser({ id: n.userId });
    return { ...n, userName: user?.name || 'Unknown' };
  });
}

export function deleteNotification(id) {
  const store = loadStore();
  store.notifications = store.notifications.filter((n) => n.id !== id);
  saveStore(store);
}

export function clearActivities() {
  const store = loadStore();
  store.activities = [];
  saveStore(store);
}

function csvEscape(val) {
  return `"${String(val ?? '').replace(/"/g, '""')}"`;
}

export function exportRegistrationsCSV(filter = {}) {
  const regs = getRegistrations(filter);
  const headers = ['Name', 'Email', 'Phone', 'Partner Type', 'Status', 'Organization', 'City', 'State', 'Login ID', 'Created'];
  const rows = regs.map((r) => [
    r.name, r.email, r.phone || '', r.partnerType, r.status, r.organization || '',
    r.city || '', r.state || '', r.loginId || '', r.createdAt?.slice(0, 10) || '',
  ]);
  return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}

export function exportActivitiesCSV() {
  const items = getActivities(500);
  const headers = ['Date', 'User', 'Action', 'Entity', 'Details'];
  const rows = items.map((a) => [
    a.createdAt?.slice(0, 19) || '', a.userName, a.action, a.entityType, a.details || '',
  ]);
  return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}

export function exportAnnouncementsCSV() {
  const items = getAnnouncements(false);
  const headers = ['Title', 'Message', 'Active', 'Created'];
  const rows = items.map((a) => [a.title, a.message, a.active !== false, a.createdAt?.slice(0, 10) || '']);
  return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}

// ─── Direct Messages (Admin ↔ Partner) ───
export function conversationId(a, b) {
  return [a, b].sort().join('__');
}

export function getAdminUser() {
  return findUser({ role: 'super_admin' }) || findUser({ role: 'admin' });
}

export function createDirectMessage({
  senderId, senderName, senderRole, recipientId, text = '', attachment = null,
}) {
  const store = loadStore();
  const convId = conversationId(senderId, recipientId);
  const msg = {
    id: newId(),
    conversationId: convId,
    senderId,
    senderName,
    senderRole,
    recipientId,
    text: text?.trim() || '',
    type: attachment ? attachment.type : 'text',
    fileUrl: attachment?.url || '',
    fileName: attachment?.name || '',
    fileMime: attachment?.mime || '',
    fileSize: attachment?.size || 0,
    read: false,
    createdAt: now(),
  };
  if (!store.messages) store.messages = [];
  store.messages.push(msg);
  saveStore(store);
  return msg;
}

export function getThread(userId, otherUserId, limit = 200) {
  const convId = conversationId(userId, otherUserId);
  return sortByDate(
    loadStore().messages.filter((m) => m.conversationId === convId),
    'createdAt',
    false
  ).slice(-limit);
}

export function getInboxForUser(userId, role) {
  const messages = loadStore().messages || [];
  const relevant = messages.filter((m) => m.senderId === userId || m.recipientId === userId);
  const convMap = {};

  relevant.forEach((m) => {
    const otherId = m.senderId === userId ? m.recipientId : m.senderId;
    if (!convMap[otherId] || new Date(m.createdAt) > new Date(convMap[otherId].lastAt)) {
      const other = findUser({ id: otherId });
      const unread = messages.filter(
        (x) => x.conversationId === m.conversationId && x.recipientId === userId && !x.read
      ).length;
      convMap[otherId] = {
        otherUserId: otherId,
        otherUserName: other?.name || 'User',
        otherUserRole: other?.role,
        otherUserAvatar: other?.name?.charAt(0) || '?',
        lastMessage: m.text || (m.fileName ? `📎 ${m.fileName}` : 'Attachment'),
        lastAt: m.createdAt,
        unread,
        conversationId: m.conversationId,
      };
    }
  });

  return sortByDate(Object.values(convMap), 'lastAt');
}

export function markThreadRead(userId, otherUserId) {
  const store = loadStore();
  const convId = conversationId(userId, otherUserId);
  store.messages.forEach((m) => {
    if (m.conversationId === convId && m.recipientId === userId) m.read = true;
  });
  saveStore(store);
}

export function exportFullBackup() {
  const store = loadStore();
  const { users, ...rest } = store;
  return {
    exportedAt: now(),
    users: users.map((u) => {
      const { password, ...safe } = u;
      return safe;
    }),
    ...rest,
    formTemplates: getFormTemplates(),
  };
}

// ─── Settings ───
export function getSettings() {
  const s = loadStore().settings;
  return s || {
    companyName: 'Dream Mantra',
    supportEmail: 'info@dreammantra.in',
    supportPhone: '9680102276',
    defaultCommissionRate: 10,
    whatsappNumber: '919680102276',
    welcomeMessage: 'Welcome to Dream Mantra Partner Network!',
    minPayoutAmount: 500,
    autoApprovePartners: false,
  };
}

export function updateSettings(updates) {
  const store = loadStore();
  store.settings = { ...store.settings, ...updates };
  saveStore(store);
  return store.settings;
}

// ─── Analytics ───
export function getMonthlyTrends(months = 6) {
  const leads = loadStore().leads;
  const result = [];
  const nowDate = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLeads = leads.filter((l) => {
      const c = new Date(l.createdAt);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    });
    result.push({
      month: key,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      total: monthLeads.length,
      converted: monthLeads.filter((l) => l.status === 'converted').length,
    });
  }
  return result;
}

export function getLeaderboard(limit = 10) {
  return queryUsers({ status: 'active' })
    .map((p) => ({
      ...userToSafeJSON(p),
      conversionRate: p.totalLeads ? Math.round((p.convertedLeads / p.totalLeads) * 100) : 0,
    }))
    .sort((a, b) => b.convertedLeads - a.convertedLeads || b.totalLeads - a.totalLeads)
    .slice(0, limit);
}

export function getFollowUps(filter = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);
  const todayStr = today.toDateString();

  let leads = loadStore().leads.filter((l) => l.followUpDate && !['converted', 'lost', 'completed'].includes(l.status));
  if (filter.partnerId) leads = leads.filter((l) => l.partnerId === filter.partnerId);
  if (filter.assignedSalesId) {
    leads = leads.filter((l) => l.assignedSalesId === filter.assignedSalesId || l.assignedTo === filter.assignedSalesId);
  }
  if (filter.assignedCounsellorId) {
    leads = leads.filter((l) => l.assignedCounsellorId === filter.assignedCounsellorId);
  }
  if (filter.overdue) {
    leads = leads.filter((l) => new Date(l.followUpDate) < today);
  } else if (filter.upcoming) {
    leads = leads.filter((l) => {
      const d = new Date(l.followUpDate);
      return d >= today && d <= weekLater;
    });
  } else if (filter.today) {
    leads = leads.filter((l) => new Date(l.followUpDate).toDateString() === todayStr);
  }
  return sortByDate(leads.map((l) => ({ ...populateLead(l), followUpDate: l.followUpDate })), 'followUpDate', false);
}

/** Activity reminder rows shaped like lead follow-ups for shared UI */
function activityToFollowUpRow(a, partner) {
  return {
    id: a.id,
    kind: 'activity',
    activityId: a.id,
    partnerId: a.partnerId,
    partnerName: partner?.name || partner?.agencyName || 'Partner',
    studentName: partner?.name || partner?.agencyName || 'Partner activity',
    leadId: 'Activity',
    status: a.completed ? 'completed' : 'follow_up',
    followUpDate: a.followUpDate,
    comment: a.comment,
    type: a.type,
    createdBy: a.createdBy,
    createdByName: a.createdByName,
    createdByRole: a.createdByRole,
  };
}

export function getActivityFollowUpBuckets(filter = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);
  const todayStr = today.toDateString();

  let list = (loadStore().partnerActivities || []).filter((a) => a.followUpDate && !a.completed);
  if (filter.createdBy) list = list.filter((a) => a.createdBy === filter.createdBy);
  if (filter.createdByRole) list = list.filter((a) => a.createdByRole === filter.createdByRole);
  if (filter.partnerId) list = list.filter((a) => a.partnerId === filter.partnerId);

  const overdue = [];
  const upcoming = [];
  const todayList = [];
  for (const a of list) {
    const partner = findUser({ id: a.partnerId });
    const d = new Date(a.followUpDate);
    const row = activityToFollowUpRow(a, partner);
    if (d < today) overdue.push(row);
    else if (d.toDateString() === todayStr) todayList.push(row);
    if (d >= today && d <= weekLater) upcoming.push(row);
  }
  return {
    overdue: sortByDate(overdue, 'followUpDate', false),
    upcoming: sortByDate(upcoming, 'followUpDate', false),
    today: sortByDate(todayList, 'followUpDate', false),
  };
}

function mergeFollowUpBuckets(leadBuckets, activityBuckets) {
  const merge = (a, b) => sortByDate([...(a || []), ...(b || [])], 'followUpDate', false);
  return {
    overdue: merge(leadBuckets.overdue, activityBuckets.overdue),
    upcoming: merge(leadBuckets.upcoming, activityBuckets.upcoming),
    today: merge(leadBuckets.today, activityBuckets.today),
  };
}

/** Single pass buckets — avoids rescanning leads 3x. Includes activity reminders. */
export function getFollowUpBuckets(filter = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);
  const todayStr = today.toDateString();

  let leads = loadStore().leads.filter((l) => l.followUpDate && !['converted', 'lost', 'completed'].includes(l.status));
  if (filter.partnerId) leads = leads.filter((l) => l.partnerId === filter.partnerId);
  if (filter.assignedSalesId) {
    leads = leads.filter((l) => l.assignedSalesId === filter.assignedSalesId || l.assignedTo === filter.assignedSalesId);
  }
  if (filter.assignedCounsellorId) {
    leads = leads.filter((l) => l.assignedCounsellorId === filter.assignedCounsellorId);
  }

  const overdue = [];
  const upcoming = [];
  const todayList = [];
  for (const l of leads) {
    const d = new Date(l.followUpDate);
    const row = { ...populateLead(l), followUpDate: l.followUpDate, kind: 'lead' };
    if (d < today) overdue.push(row);
    else if (d.toDateString() === todayStr) todayList.push(row);
    if (d >= today && d <= weekLater) upcoming.push(row);
  }
  const leadBuckets = {
    overdue: sortByDate(overdue, 'followUpDate', false),
    upcoming: sortByDate(upcoming, 'followUpDate', false),
    today: sortByDate(todayList, 'followUpDate', false),
  };

  // Sales/counsellor: only their own activity reminders; admin/others: all (unless createdBy set)
  const activityFilter = {};
  if (filter.activityCreatedBy) activityFilter.createdBy = filter.activityCreatedBy;
  else if (filter.assignedSalesId && !filter.includeAllActivityFollowUps) {
    activityFilter.createdBy = filter.assignedSalesId;
  } else if (filter.assignedCounsellorId && !filter.includeAllActivityFollowUps) {
    activityFilter.createdBy = filter.assignedCounsellorId;
  }
  if (filter.partnerId) activityFilter.partnerId = filter.partnerId;

  return mergeFollowUpBuckets(leadBuckets, getActivityFollowUpBuckets(activityFilter));
}

export function findDuplicateLeads(phone, excludeId = null) {
  const normalized = (phone || '').replace(/\D/g, '').slice(-10);
  if (!normalized) return [];
  return loadStore().leads.filter((l) => {
    if (excludeId && l.id === excludeId) return false;
    const lp = (l.studentPhone || '').replace(/\D/g, '').slice(-10);
    return lp === normalized;
  });
}

export function bulkCreateLeads(leadsData, partnerId, createdBy) {
  const partner = findUser({ id: partnerId });
  if (!partner) throw new Error('Partner not found');
  const created = [];
  for (const data of leadsData) {
    if (!data.studentName?.trim() || !data.studentPhone?.trim()) continue;
    const lead = createLead({
      ...data,
      leadId: data.leadId || (() => {
        let id = generateLeadId(data.leadType || 'student');
        while (getLeads().some((l) => l.leadId === id)) id = generateLeadId(data.leadType || 'student');
        return id;
      })(),
      partnerId: partner.id,
      partnerName: partner.name,
      partnerType: partner.partnerType,
      status: 'new',
      statusHistory: [{ status: 'new', note: 'Bulk import', updatedBy: createdBy?.id, updatedByName: createdBy?.name, createdAt: now() }],
    });
    created.push(lead);
  }
  if (created.length) {
    updateUser(partner.id, { totalLeads: (partner.totalLeads || 0) + created.length });
  }
  return created;
}

export function exportLeadsCSV(filter = {}) {
  const leads = getLeads(filter).map(populateLead);
  const headers = ['Lead ID', 'Student', 'Phone', 'Email', 'Class', 'City', 'Status', 'Partner', 'Priority', 'Created'];
  const rows = leads.map((l) => [
    l.leadId, l.studentName, l.studentPhone, l.studentEmail || '', l.classGrade || '',
    l.city || '', l.status, l.partnerName || '', l.priority || '', l.createdAt?.slice(0, 10) || '',
  ]);
  return [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function deleteLead(id) {
  const store = loadStore();
  const lead = store.leads.find((l) => l.id === id);
  if (!lead) return null;
  const oldPartnerId = lead.partnerId;
  store.leads = store.leads.filter((l) => l.id !== id);
  store.commissions = store.commissions.filter((c) => c.leadId !== id);
  store.leadComments = store.leadComments.filter((c) => c.leadId !== id);
  saveStore(store);
  recalculatePartnerStats(oldPartnerId);
  return lead;
}

export function deleteUser(id) {
  const store = loadStore();
  const user = store.users.find((u) => u.id === id);
  if (!user) return null;
  store.users = store.users.filter((u) => u.id !== id);
  saveStore(store);
  return user;
}

export function deletePartner(id) {
  const store = loadStore();
  const partner = store.users.find((u) => u.id === id && u.role === 'partner');
  if (!partner) return null;
  store.users = store.users.filter((u) => u.id !== id);
  saveStore(store);
  return partner;
}

export function deleteCommission(id) {
  const store = loadStore();
  const idx = store.commissions.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const [removed] = store.commissions.splice(idx, 1);
  saveStore(store);
  return removed;
}

export function deleteAnnouncement(id) {
  const store = loadStore();
  store.announcements = store.announcements.filter((a) => a.id !== id);
  saveStore(store);
}

export function getPartnerDetail(id) {
  const partner = findUser({ id });
  if (!partner || partner.role !== 'partner') return null;
  const leads = getLeads({ partnerId: id });
  const commissions = getCommissions({ partnerId: id });
  const resources = getPartnerResources(id);
  const products = getAllocatedProductsForPartner(id);
  const overrides = getProductRateOverrides({ scope: 'partner', entityId: id });
  const productRates = products.map((prod) => {
    const resolved = resolveProductRate({ productId: prod.id, partnerId: id });
    const ov = overrides.find((o) => o.productId === prod.id);
    return {
      productId: prod.id,
      label: prod.label,
      costPrice: resolved?.costPrice ?? prod.costPrice ?? prod.price,
      sellingPrice: resolved?.sellingPrice ?? prod.defaultSellingPrice ?? prod.price,
      commission: resolved?.commission || prod.commission || { type: 'fixed', value: 0 },
      overrideId: ov?.id || null,
      hasOverride: !!ov,
    };
  });
  const payouts = getPayoutRequests({ partnerId: id });
  const paid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0);
  const pending = commissions.filter((c) => c.status === 'pending' || c.status === 'approved').reduce((s, c) => s + (c.amount || 0), 0);
  const activities = getPartnerActivities(id);
  const projects = getAgencyProjects(id).map((proj) => enrichProject(proj, leads));
  const stageBreakdown = {};
  leads.forEach((l) => {
    const s = l.status || 'new';
    stageBreakdown[s] = (stageBreakdown[s] || 0) + 1;
  });
  const upcomingFollowUps = leads
    .filter((l) => l.followUpDate && !['completed', 'converted', 'lost'].includes(l.status))
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
  return {
    partner: userToSafeJSON(partner),
    leads: leads.map((l) => ({ ...l, _id: l.id })),
    commissions: commissions.map(populateCommission),
    resources,
    productRates,
    payouts,
    activities,
    projects,
    stageBreakdown,
    nextFollowUp: upcomingFollowUps[0] || null,
    stats: {
      totalLeads: leads.length,
      converted: leads.filter((l) => ['converted', 'completed'].includes(l.status)).length,
      pendingCommission: pending,
      paidCommission: paid,
      totalEarnings: partner.totalEarnings || paid,
      openFollowUps: upcomingFollowUps.length,
      projectCount: projects.length,
    },
  };
}

export function recalculatePartnerStats(partnerId) {
  const leads = loadStore().leads.filter((l) => l.partnerId === partnerId);
  return updateUser(partnerId, {
    totalLeads: leads.length,
    convertedLeads: leads.filter((l) => l.status === 'converted').length,
  });
}

export function transferLead(leadId, newPartnerId) {
  const lead = findLead(leadId);
  const newPartner = findUser({ id: newPartnerId });
  if (!lead || !newPartner || newPartner.role !== 'partner') throw new Error('Invalid lead or partner');
  const oldPartnerId = lead.partnerId;
  const updated = updateLead(leadId, {
    partnerId: newPartner.id,
    partnerName: newPartner.name,
    partnerType: newPartner.partnerType,
  });
  recalculatePartnerStats(oldPartnerId);
  recalculatePartnerStats(newPartner.id);
  return updated;
}

export function bulkUpdateLeads(ids, updates) {
  return ids.map((id) => updateLead(id, updates)).filter(Boolean);
}

export function bulkUpdatePartners(ids, updates) {
  return ids.map((id) => updateUser(id, updates)).filter(Boolean);
}

export function getAllDuplicateGroups() {
  const leads = loadStore().leads;
  const phoneMap = {};
  leads.forEach((l) => {
    const phone = (l.studentPhone || '').replace(/\D/g, '').slice(-10);
    if (!phone || phone.length < 10) return;
    if (!phoneMap[phone]) phoneMap[phone] = [];
    phoneMap[phone].push(l);
  });
  return Object.entries(phoneMap)
    .filter(([, group]) => group.length > 1)
    .map(([phone, group]) => ({ phone, leads: group.map((l) => populateLead(l)) }));
}

export function exportPartnersCSV() {
  const partners = queryUsers();
  const headers = ['Name', 'Partner ID', 'Email', 'Phone', 'Type', 'Tier', 'Status', 'Organization', 'City', 'Leads', 'Converted', 'Commission%', 'Referral Code'];
  const rows = partners.map((p) => [
    p.name, p.loginId || '', p.email, p.phone || '', p.partnerType, p.tier || 'bronze', p.status,
    p.organization || '', p.city || '', p.totalLeads || 0, p.convertedLeads || 0,
    p.commissionRate || 10, p.referralCode,
  ]);
  return [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function exportCommissionsCSV() {
  const items = getCommissions().map(populateCommission);
  const headers = ['Partner', 'Lead ID', 'Student', 'Amount', 'Rate', 'Status', 'Paid At', 'Reference'];
  const rows = items.map((c) => [
    c.partner?.name, c.lead?.leadId, c.lead?.studentName, c.amount, c.rate,
    c.status, c.paidAt?.slice(0, 10) || '', c.paymentReference || '',
  ]);
  return [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function getSystemStats() {
  const store = loadStore();
  return {
    users: store.users.length,
    partners: store.users.filter((u) => u.role === 'partner').length,
    franchises: store.users.filter((u) => u.role === 'partner' && (u.partnerType === 'agency' || u.partnerType === 'franchise')).length,
    agencies: store.users.filter((u) => u.role === 'partner' && (u.partnerType === 'agency' || u.partnerType === 'franchise')).length,
    leads: store.leads.length,
    commissions: store.commissions.length,
    notifications: store.notifications.length,
    activities: store.activities.length,
    announcements: store.announcements.length,
  };
}

export function getAgencies() {
  return queryUsers({ partnerType: 'agency' })
    .concat(queryUsers({ partnerType: 'franchise' }))
    .map((f) => {
    const norm = normalizeAgencyUser(f);
    const leads = getLeads({ partnerId: f.id });
    const commissions = getCommissions({ partnerId: f.id });
    const converted = leads.filter((l) => ['completed', 'converted'].includes(normalizeLeadStatus(l.status))).length;
    const paid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
    const onboarding = norm.agencyOnboarding || {};
    const stepsDone = AGENCY_ONBOARDING_KEYS.filter((k) => onboarding[k]).length;
    return {
      ...userToSafeJSON(norm),
      stats: {
        totalLeads: leads.length,
        converted,
        conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
        totalEarnings: paid,
        onboardingProgress: Math.round((stepsDone / AGENCY_ONBOARDING_KEYS.length) * 100),
      },
    };
  });
}

/** @deprecated use getAgencies */
export const getFranchises = getAgencies;

export function getAgencyHubData(partnerId) {
  const partner = normalizeAgencyUser(findUser({ id: partnerId }));
  if (!partner || !isAgencyPartner(partner)) return null;

  const leads = getLeads({ partnerId });
  const commissions = getCommissions({ partnerId });
  const converted = leads.filter((l) => ['completed', 'converted'].includes(normalizeLeadStatus(l.status))).length;
  const paid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
  const pending = commissions.filter((c) => c.status === 'pending' || c.status === 'approved').reduce((s, c) => s + c.amount, 0);

  const monthlyTarget = agencyTierTarget(partner.investmentTier);
  const nowDate = new Date();
  const monthLeads = leads.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === nowDate.getMonth() && d.getFullYear() === nowDate.getFullYear();
  }).length;

  let onboarding = { ...(partner.agencyOnboarding || {}) };
  if (leads.length > 0) onboarding.firstLeadSubmitted = true;
  if (partner.bankAccount || partner.upiId) onboarding.payoutDetailsAdded = true;
  const stepsDone = AGENCY_ONBOARDING_KEYS.filter((k) => onboarding[k]).length;

  const monthlyTrend = getMonthlyTrends(6).map((m) => ({
    ...m,
    agencyLeads: leads.filter((l) => {
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === m.month;
    }).length,
  }));

  const team = getTeamMembers({ agencyId: partnerId });

  return {
    partner: userToSafeJSON({ ...partner, agencyOnboarding: onboarding }),
    territory: partner.territory || partner.city || '—',
    stats: {
      totalLeads: leads.length,
      converted,
      conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
      monthLeads,
      monthlyTarget,
      targetProgress: Math.min(100, Math.round((monthLeads / monthlyTarget) * 100)),
      paidCommission: paid,
      pendingCommission: pending,
      outletCount: partner.outletCount || 1,
      royaltyPercent: partner.royaltyPercent ?? 8,
      onboardingProgress: Math.round((stepsDone / AGENCY_ONBOARDING_KEYS.length) * 100),
      teamSize: team.length,
    },
    onboarding,
    monthlyTrend,
    team,
    marketingKit: [
      { title: 'Brand Guidelines PDF', type: 'document', url: '#' },
      { title: 'Agency Launch Checklist', type: 'document', url: '#' },
      { title: 'Social Media Templates', type: 'media', url: '#' },
      { title: 'Parent Orientation Deck', type: 'presentation', url: '#' },
      { title: 'Lead Conversion Playbook', type: 'document', url: '#' },
      { title: 'Commission Structure Guide', type: 'document', url: '#' },
    ],
  };
}

/** @deprecated */
export const getFranchiseHubData = getAgencyHubData;

export function updateAgencyOnboarding(partnerId, updates) {
  const partner = findUser({ id: partnerId });
  if (!partner || !isAgencyPartner(partner)) return null;
  const onboarding = { ...(partner.agencyOnboarding || partner.franchiseOnboarding || {}), ...updates };
  return updateUser(partnerId, { agencyOnboarding: onboarding });
}

/** @deprecated */
export const updateFranchiseOnboarding = updateAgencyOnboarding;

// ─── Staff & multi-role ───
export function queryStaffUsers(filter = {}) {
  let users = getUsers().filter((u) => isStaffRole(u.role));
  if (filter.role && filter.role !== 'all') users = users.filter((u) => u.role === filter.role);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    users = users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }
  return sortByDate(users).map(userToSafeJSON);
}

export async function createStaffUser(data) {
  if (!STAFF_ROLES.includes(data.role)) throw new Error('Invalid staff role');
  const hash = await bcrypt.hash(data.password, 10);
  return userToSafeJSON(
    createUser({
      ...data,
      email: data.email.toLowerCase(),
      password: hash,
      status: data.status || 'active',
      permissions: data.permissions || getDefaultPermissions(data.role),
      partnerType: null,
    })
  );
}

export function getRolePermissions() {
  const store = loadStore();
  return store.settings.rolePermissions || {};
}

export function updateRolePermissions(rolePermissions, { replace = false } = {}) {
  const store = loadStore();
  store.settings.rolePermissions = replace
    ? { ...(rolePermissions || {}) }
    : { ...(store.settings.rolePermissions || {}), ...(rolePermissions || {}) };
  saveStore(store);
  return store.settings.rolePermissions;
}

export function getProducts() {
  return (loadStore().settings.products || []).map(normalizeProduct);
}

function normalizeProduct(p) {
  const cost = Number(p.price ?? p.costPrice) || 0;
  const selling = Number(p.defaultSellingPrice ?? p.sellingPrice ?? cost) || cost;
  return {
    ...p,
    price: cost,
    costPrice: cost,
    defaultSellingPrice: selling,
    commission: p.commission || { type: 'fixed', value: 0 },
  };
}

export function updateProducts(products) {
  const store = loadStore();
  store.settings.products = (products || []).map((p) => {
    const cost = Number(p.costPrice ?? p.price) || 0;
    return {
      id: p.id || newId(),
      label: (p.label || '').trim() || 'Product',
      price: cost,
      defaultSellingPrice: Number(p.defaultSellingPrice ?? p.sellingPrice ?? cost) || cost,
      commission: p.commission
        ? { type: p.commission.type === 'percentage' ? 'percentage' : 'fixed', value: Number(p.commission.value) || 0 }
        : { type: 'fixed', value: 0 },
    };
  });
  saveStore(store);
  return getProducts();
}

// ─── Custom roles ───
export function getCustomRoles() {
  return loadStore().settings.customRoles || [];
}

export function getAllRolesForAdmin() {
  const customRoles = getCustomRoles();
  const rolePermissions = getRolePermissions();
  const builtin = EDITABLE_STAFF_ROLES;
  const customKeys = customRoles.map((r) => r.key);
  return {
    roles: [...builtin, ...customKeys],
    builtin,
    customRoles,
    defaults: Object.fromEntries(builtin.map((r) => [r, getDefaultPermissions(r)])),
    rolePermissions,
  };
}

function slugifyRoleKey(label) {
  const base = (label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return base || `role_${newId().slice(0, 6)}`;
}

export function createCustomRole({ label, permissions, key }) {
  const store = loadStore();
  if (!store.settings.customRoles) store.settings.customRoles = [];
  const labelText = (label || '').trim();
  if (!labelText) throw new Error('label required');
  let roleKey = key ? slugifyRoleKey(key) : slugifyRoleKey(labelText);
  let n = 1;
  const taken = (k) =>
    USER_ROLES.includes(k) ||
    EDITABLE_STAFF_ROLES.includes(k) ||
    store.settings.customRoles.some((r) => r.key === k);
  while (taken(roleKey)) roleKey = `${slugifyRoleKey(labelText)}_${n++}`;
  const role = {
    id: newId(),
    key: roleKey,
    label: labelText,
    permissions: Array.isArray(permissions) ? permissions : [],
  };
  store.settings.customRoles.push(role);
  saveStore(store);
  return role;
}

export function updateCustomRole(id, updates) {
  const store = loadStore();
  const idx = (store.settings.customRoles || []).findIndex((r) => r.id === id || r.key === id);
  if (idx === -1) return null;
  const existing = store.settings.customRoles[idx];
  const next = { ...existing };
  if (updates.label != null) next.label = String(updates.label).trim();
  if (updates.permissions != null) next.permissions = Array.isArray(updates.permissions) ? updates.permissions : existing.permissions;
  if (updates.key != null) {
    const roleKey = slugifyRoleKey(updates.key);
    const clash = store.settings.customRoles.some(
      (r, i) => i !== idx && r.key === roleKey
    ) || USER_ROLES.includes(roleKey);
    if (!clash) next.key = roleKey;
  }
  store.settings.customRoles[idx] = next;
  saveStore(store);
  return next;
}

export function deleteCustomRole(id) {
  const store = loadStore();
  const before = store.settings.customRoles || [];
  const removed = before.find((r) => r.id === id || r.key === id);
  if (!removed) return null;
  store.settings.customRoles = before.filter((r) => r.id !== removed.id);
  if (store.settings.rolePermissions?.[removed.key]) {
    delete store.settings.rolePermissions[removed.key];
  }
  saveStore(store);
  return removed;
}

// ─── Product allocations ───
export function getProductAllocations() {
  return loadStore().settings.productAllocations || [];
}

export function setProductAllocations(allocations) {
  const store = loadStore();
  store.settings.productAllocations = Array.isArray(allocations)
    ? allocations.map((a) => ({
        productId: a.productId,
        partnerIds: Array.isArray(a.partnerIds) ? a.partnerIds : [],
      }))
    : [];
  saveStore(store);
  return store.settings.productAllocations;
}

export function getAllocatedProductsForPartner(partnerId) {
  const allocations = getProductAllocations();
  const all = getProducts();
  // No allocation config yet → show all products so Admin can still assign prices
  if (!allocations.length) return all;
  const productIds = new Set(
    allocations
      .filter((a) => {
        const ids = a.partnerIds || [];
        return ids.includes(partnerId) || ids.includes('all');
      })
      .map((a) => a.productId)
  );
  // If this partner has zero allocated products, return empty (explicitly no products)
  const anyForPartner = allocations.some((a) => {
    const ids = a.partnerIds || [];
    return ids.includes(partnerId) || ids.includes('all');
  });
  if (!anyForPartner) return [];
  return all.filter((p) => productIds.has(p.id));
}

// ─── Rates (list / sale pricing) ───
export function getRates(filter = {}) {
  let rates = loadStore().settings.rates || [];
  if (filter.audience) rates = rates.filter((r) => r.audience === filter.audience);
  if (filter.productId) rates = rates.filter((r) => r.productId === filter.productId);
  if (filter.partnerId != null && filter.partnerId !== '') {
    rates = rates.filter(
      (r) => r.partnerId === filter.partnerId || r.partnerId === 'all' || r.partnerId == null
    );
  }
  return rates;
}

export function upsertRate(data) {
  const store = loadStore();
  if (!store.settings.rates) store.settings.rates = [];
  const payload = {
    audience: data.audience === 'student' ? 'student' : 'partner',
    productId: data.productId,
    partnerId: data.partnerId == null || data.partnerId === '' ? null : data.partnerId,
    listPrice: Number(data.listPrice) || 0,
    salePrice: Number(data.salePrice) || 0,
  };
  if (data.id) {
    const idx = store.settings.rates.findIndex((r) => r.id === data.id);
    if (idx !== -1) {
      store.settings.rates[idx] = { ...store.settings.rates[idx], ...payload };
      saveStore(store);
      return store.settings.rates[idx];
    }
  }
  const rate = { id: newId(), ...payload };
  store.settings.rates.push(rate);
  saveStore(store);
  return rate;
}

export function deleteRate(id) {
  const store = loadStore();
  const before = store.settings.rates || [];
  const removed = before.find((r) => r.id === id);
  if (!removed) return null;
  store.settings.rates = before.filter((r) => r.id !== id);
  saveStore(store);
  return removed;
}

/** Per-entity product price/commission overrides (partner | project | lead) */
export function getProductRateOverrides(filter = {}) {
  let list = loadStore().settings.productRateOverrides || [];
  if (filter.scope) list = list.filter((o) => o.scope === filter.scope);
  if (filter.entityId) list = list.filter((o) => o.entityId === filter.entityId);
  if (filter.productId) list = list.filter((o) => o.productId === filter.productId);
  return list;
}

/**
 * Upsert override.
 * @param {object} data
 * @param {{ allowCost?: boolean }} opts - partners/agencies must pass allowCost:false (default false for non-admin callers)
 */
export function upsertProductRateOverride(data, opts = {}) {
  const store = loadStore();
  if (!store.settings.productRateOverrides) store.settings.productRateOverrides = [];
  const scope = ['lead', 'project', 'partner'].includes(data.scope) ? data.scope : 'partner';
  const entityId = data.entityId;
  const productId = data.productId;
  if (!entityId || !productId) throw new Error('entityId and productId required');

  const allowCost = opts.allowCost !== false && data.allowCost !== false;
  const costIn = data.costPrice != null ? data.costPrice : data.listPrice;
  const sellIn = data.sellingPrice != null ? data.sellingPrice : data.salePrice;

  const payload = {
    scope,
    entityId,
    productId,
    updatedAt: now(),
  };
  if (sellIn != null && sellIn !== '') payload.sellingPrice = Number(sellIn);
  if (allowCost && costIn != null && costIn !== '') payload.costPrice = Number(costIn);
  // Legacy field mirrors for older readers
  if (payload.sellingPrice != null) payload.salePrice = payload.sellingPrice;
  if (payload.costPrice != null) payload.listPrice = payload.costPrice;
  if (data.commission) {
    payload.commission = {
      type: data.commission.type === 'percentage' ? 'percentage' : 'fixed',
      value: Number(data.commission.value) || 0,
    };
  }

  const idx = store.settings.productRateOverrides.findIndex(
    (o) => o.scope === scope && o.entityId === entityId && o.productId === productId
  );
  if (idx >= 0) {
    const prev = store.settings.productRateOverrides[idx];
    const next = { ...prev, ...payload, id: prev.id };
    // Partner/agency path: never overwrite existing cost with blank
    if (!allowCost) {
      next.costPrice = prev.costPrice ?? prev.listPrice;
      next.listPrice = next.costPrice;
    }
    store.settings.productRateOverrides[idx] = next;
    saveStore(store);
    return store.settings.productRateOverrides[idx];
  }
  const row = { id: newId(), createdAt: now(), ...payload };
  store.settings.productRateOverrides.push(row);
  saveStore(store);
  return row;
}

export function deleteProductRateOverride(id) {
  const store = loadStore();
  const before = store.settings.productRateOverrides || [];
  const removed = before.find((o) => o.id === id);
  if (!removed) return null;
  store.settings.productRateOverrides = before.filter((o) => o.id !== id);
  saveStore(store);
  return removed;
}

function applyOverrideFields(base, ov) {
  if (!ov) return;
  const cost = ov.costPrice ?? ov.listPrice;
  const sell = ov.sellingPrice ?? ov.salePrice;
  if (cost != null) base.costPrice = Number(cost);
  if (sell != null) base.sellingPrice = Number(sell);
  if (ov.commission) base.commission = ov.commission;
  base.listPrice = base.costPrice;
  base.salePrice = base.sellingPrice;
}

/** Resolve Cost (to partner) + Selling (to customer). Agency cannot set cost via API. */
export function resolveProductRate({ productId, leadId, partnerId, projectId }) {
  const products = getProducts();
  const prod = products.find((p) => p.id === productId || p.label === productId);
  if (!prod) return null;
  const base = {
    productId: prod.id,
    label: prod.label,
    costPrice: prod.costPrice ?? prod.price ?? 0,
    sellingPrice: prod.defaultSellingPrice ?? prod.price ?? 0,
    commission: prod.commission || { type: 'fixed', value: 0 },
  };
  base.listPrice = base.costPrice;
  base.salePrice = base.sellingPrice;

  if (partnerId) {
    const rates = getRates({ audience: 'partner', productId: prod.id });
    const specific = rates.find((r) => r.partnerId === partnerId);
    const shared = rates.find((r) => r.partnerId === 'all' || r.partnerId == null);
    const rate = specific || shared;
    if (rate) {
      if (rate.listPrice != null) base.costPrice = Number(rate.listPrice);
      if (rate.salePrice != null) base.sellingPrice = Number(rate.salePrice);
    }
    applyOverrideFields(base, getProductRateOverrides({ scope: 'partner', entityId: partnerId, productId: prod.id })[0]);
  }

  const effectiveProjectId = projectId
    || (leadId ? (findLead(leadId)?.projectId || null) : null);
  if (effectiveProjectId) {
    applyOverrideFields(base, getProductRateOverrides({ scope: 'project', entityId: effectiveProjectId, productId: prod.id })[0]);
  }

  if (leadId) {
    applyOverrideFields(base, getProductRateOverrides({ scope: 'lead', entityId: leadId, productId: prod.id })[0]);
  }

  base.listPrice = base.costPrice;
  base.salePrice = base.sellingPrice;
  return base;
}

export function computeCommissionAmount(lead, partner) {
  const interested = lead.interestedIn || [];
  let total = 0;
  const partnerId = partner?.id || lead.partnerId;
  const leadId = lead.id || lead._id;
  const projectId = lead.projectId || null;
  if (interested.length) {
    interested.forEach((label) => {
      const resolved = resolveProductRate({ productId: label, leadId, partnerId, projectId });
      if (!resolved) return;
      const price = resolved.sellingPrice ?? resolved.salePrice ?? 0;
      if (resolved.commission?.type === 'fixed') total += Number(resolved.commission.value) || 0;
      else if (resolved.commission?.type === 'percentage') total += price * ((Number(resolved.commission.value) || 0) / 100);
    });
  }
  if (!total) {
    const products = getProducts();
    if (products[0]) {
      const resolved = resolveProductRate({ productId: products[0].id, leadId, partnerId, projectId });
      const price = lead.dealValue || lead.expectedValue || resolved?.sellingPrice || 5000;
      if (resolved?.commission?.type === 'fixed') total = Number(resolved.commission.value) || 0;
      else if (resolved?.commission?.type === 'percentage') total = price * ((Number(resolved.commission.value) || 0) / 100);
      else total = price * ((partner?.commissionRate || 10) / 100);
    } else {
      total = (lead.expectedValue || 5000) * ((partner?.commissionRate || 10) / 100);
    }
  }
  return Math.round(total);
}

/** Partner-facing rates for allocated products */
export function getRatesForPartner(partnerId) {
  const products = getAllocatedProductsForPartner(partnerId);
  return products.map((product) => {
    const resolved = resolveProductRate({ productId: product.id, partnerId });
    return {
      productId: product.id,
      label: product.label,
      costPrice: resolved?.costPrice ?? product.costPrice ?? product.price ?? 0,
      sellingPrice: resolved?.sellingPrice ?? product.defaultSellingPrice ?? product.price ?? 0,
      commission: resolved?.commission || product.commission || { type: 'fixed', value: 0 },
      // legacy
      listPrice: resolved?.costPrice ?? product.price ?? 0,
      salePrice: resolved?.sellingPrice ?? product.price ?? 0,
    };
  });
}

// ─── Partner / default resources ───
export function getPartnerResources(partnerId, category) {
  let resources = loadStore().settings.partnerResources || [];
  if (partnerId && partnerId !== 'all') {
    resources = resources.filter((r) => r.partnerId === partnerId || r.partnerId === 'all');
  } else if (partnerId === 'all') {
    resources = resources.filter((r) => r.partnerId === 'all');
  }
  if (category) resources = resources.filter((r) => r.category === category);
  return resources;
}

export function addPartnerResource(data) {
  const store = loadStore();
  if (!store.settings.partnerResources) store.settings.partnerResources = [];
  const resource = {
    id: newId(),
    partnerId: data.partnerId || 'all',
    category: data.category || 'training',
    title: (data.title || '').trim(),
    type: data.type || 'link',
    url: (data.url || '').trim(),
    createdAt: now(),
  };
  store.settings.partnerResources.push(resource);
  saveStore(store);
  return resource;
}

export function deletePartnerResource(id) {
  const store = loadStore();
  const before = store.settings.partnerResources || [];
  const removed = before.find((r) => r.id === id);
  if (!removed) return null;
  store.settings.partnerResources = before.filter((r) => r.id !== id);
  saveStore(store);
  return removed;
}

/**
 * Partner-specific resources for category, else partnerId='all', else settings.defaultResources.
 */
export function getResourcesForPartner(partnerId, category) {
  const store = loadStore();
  const partnerResources = store.settings.partnerResources || [];
  const defaults = store.settings.defaultResources || [];

  const matchCat = (list) =>
    category ? list.filter((r) => r.category === category) : list;

  const specific = matchCat(partnerResources.filter((r) => r.partnerId === partnerId));
  if (specific.length) return specific;

  const forAll = matchCat(partnerResources.filter((r) => r.partnerId === 'all'));
  if (forAll.length) return forAll;

  return matchCat(defaults.map((r) => ({ ...r, partnerId: r.partnerId || 'all' })));
}

// ─── Students (from leads pipeline) ───
export function leadToStudent(lead) {
  return {
    id: lead.id,
    leadId: lead.leadId,
    studentName: lead.studentName,
    parentName: lead.parentName,
    mobile: lead.studentPhone || lead.parentPhone,
    alternateMobile: lead.alternatePhone || lead.parentPhone,
    whatsapp: lead.whatsapp || lead.studentPhone,
    email: lead.studentEmail,
    dateOfBirth: lead.dateOfBirth,
    gender: lead.gender,
    classGrade: lead.classGrade,
    school: lead.schoolCollege,
    board: lead.board,
    stream: lead.stream,
    city: lead.city,
    state: lead.state,
    products: lead.interestedIn || [],
    project: lead.project || null,
    partnerId: lead.partnerId,
    partnerName: lead.partnerName,
    status: normalizeLeadStatus(lead.status),
    assignedSalesId: lead.assignedSalesId || lead.assignedTo,
    assignedCounsellorId: lead.assignedCounsellorId,
    assignedReportId: lead.assignedReportId,
    timeline: lead.statusHistory || [],
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt || lead.createdAt,
  };
}

export function getStudents(filter = {}) {
  const store = loadStore();
  let students = store.students?.length
    ? store.students
    : store.leads.filter((l) => !['lost', 'new'].includes(normalizeLeadStatus(l.status))).map(leadToStudent);
  if (filter.assignedSalesId) students = students.filter((s) => s.assignedSalesId === filter.assignedSalesId);
  if (filter.assignedCounsellorId) students = students.filter((s) => s.assignedCounsellorId === filter.assignedCounsellorId);
  const partnerId = filter.partnerId || filter.agencyId;
  if (partnerId && partnerId !== 'all') students = students.filter((s) => s.partnerId === partnerId);
  if (filter.project && filter.project !== 'all') {
    const q = String(filter.project).toLowerCase();
    students = students.filter((s) => (s.project || '').toLowerCase() === q);
  }
  if (filter.status && filter.status !== 'all') students = students.filter((s) => s.status === filter.status);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    students = students.filter(
      (s) =>
        (s.studentName || '').toLowerCase().includes(q) ||
        (s.mobile || '').includes(q) ||
        (s.leadId || '').toLowerCase().includes(q) ||
        (s.project || '').toLowerCase().includes(q)
    );
  }
  return sortByDate(students);
}

export function syncStudentsFromLeads() {
  const store = loadStore();
  store.students = store.leads
    .filter((l) => !['lost'].includes(normalizeLeadStatus(l.status)))
    .map(leadToStudent);
  saveStore(store);
  return store.students;
}

// ─── Tasks, sessions, reports ───
export function getTasks(filter = {}) {
  let tasks = loadStore().tasks || [];
  if (filter.userId) tasks = tasks.filter((t) => t.assignedTo === filter.userId);
  if (filter.status) tasks = tasks.filter((t) => t.status === filter.status);
  return sortByDate(tasks);
}

export function createTask(data) {
  const store = loadStore();
  const task = { id: newId(), status: 'pending', createdAt: now(), ...data };
  store.tasks.push(task);
  saveStore(store);
  return task;
}

export function updateTask(id, updates) {
  const store = loadStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.tasks[idx] = { ...store.tasks[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.tasks[idx];
}

export function getSessions(filter = {}) {
  let sessions = loadStore().sessions || [];
  if (filter.counsellorId) sessions = sessions.filter((s) => s.counsellorId === filter.counsellorId);
  if (filter.studentId) sessions = sessions.filter((s) => s.studentId === filter.studentId);
  return sortByDate(sessions);
}

export function createSession(data) {
  const store = loadStore();
  const session = { id: newId(), createdAt: now(), ...data };
  store.sessions.push(session);
  saveStore(store);
  return session;
}

export function getReports(filter = {}) {
  let reports = loadStore().reports || [];
  if (filter.status) reports = reports.filter((r) => r.status === filter.status);
  if (filter.assignedTo) reports = reports.filter((r) => r.assignedTo === filter.assignedTo);
  return sortByDate(reports);
}

export function createReport(data) {
  const store = loadStore();
  const report = { id: newId(), status: 'pending', createdAt: now(), ...data };
  store.reports.push(report);
  saveStore(store);
  return report;
}

export function updateReport(id, updates) {
  const store = loadStore();
  const idx = store.reports.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  store.reports[idx] = { ...store.reports[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.reports[idx];
}

export function getCallLogs(filter = {}) {
  let logs = loadStore().callLogs || [];
  if (filter.userId) logs = logs.filter((l) => l.userId === filter.userId);
  return sortByDate(logs);
}

export function createCallLog(data) {
  const store = loadStore();
  const log = { id: newId(), createdAt: now(), ...data };
  store.callLogs.push(log);
  saveStore(store);
  return log;
}

export function getStaffDashboard(user) {
  const role = user.role;
  const leads = getLeads();
  const students = getStudents();
  const tasks = getTasks({ userId: user.id });
  const reports = getReports({ assignedTo: user.id });

  const myLeads = leads.filter(
    (l) => l.assignedSalesId === user.id || l.assignedTo === user.id || l.assignedCounsellorId === user.id
  );

  return {
    role,
    stats: {
      totalLeads: role === 'sales_executive' ? myLeads.length : leads.length,
      activeLeads: myLeads.filter((l) => !['completed', 'lost'].includes(normalizeLeadStatus(l.status))).length,
      students: role === 'counsellor'
        ? students.filter((s) => s.assignedCounsellorId === user.id).length
        : students.length,
      pendingTasks: tasks.filter((t) => t.status === 'pending').length,
      pendingReports: reports.filter((r) => r.status === 'pending').length,
      followUpsToday: myLeads.filter((l) => l.followUpDate && l.followUpDate.startsWith(new Date().toISOString().slice(0, 10))).length,
    },
    recentLeads: myLeads.slice(0, 8).map((l) => populateLead(l)),
    recentTasks: tasks.slice(0, 5),
    recentReports: reports.slice(0, 5),
  };
}

// ─── Enterprise: Payments ───
export function getPayments(filter = {}) {
  let payments = loadStore().payments || [];
  if (filter.leadId) payments = payments.filter((p) => p.leadId === filter.leadId);
  if (filter.partnerId) payments = payments.filter((p) => p.partnerId === filter.partnerId);
  if (filter.status) payments = payments.filter((p) => p.status === filter.status);
  return sortByDate(payments).map((p) => {
    const lead = findLead(p.leadId);
    return { ...p, lead: lead ? { id: lead.id, leadId: lead.leadId, studentName: lead.studentName } : null };
  });
}

export function createPayment(data) {
  const store = loadStore();
  const payment = { id: newId(), status: 'received', createdAt: now(), ...data };
  store.payments.push(payment);
  saveStore(store);
  logAudit({ action: 'payment_created', entityType: 'payment', entityId: payment.id, details: `₹${payment.amount} for lead ${payment.leadId}`, userId: data.recordedBy });
  return payment;
}

export function updatePayment(id, updates) {
  const store = loadStore();
  const idx = store.payments.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  store.payments[idx] = { ...store.payments[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.payments[idx];
}

// ─── Enterprise: Payout requests ───
export function getPayoutRequests(filter = {}) {
  let reqs = loadStore().payoutRequests || [];
  if (filter.partnerId) reqs = reqs.filter((r) => r.partnerId === filter.partnerId);
  if (filter.status) reqs = reqs.filter((r) => r.status === filter.status);
  return sortByDate(reqs).map((r) => {
    const partner = findUser({ id: r.partnerId });
    return { ...r, partner: partner ? userToSafeJSON(partner) : null };
  });
}

export function createPayoutRequest(data) {
  const store = loadStore();
  const req = { id: newId(), status: 'pending', createdAt: now(), ...data };
  store.payoutRequests.push(req);
  saveStore(store);
  return req;
}

export function updatePayoutRequest(id, updates) {
  const store = loadStore();
  const idx = store.payoutRequests.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  store.payoutRequests[idx] = { ...store.payoutRequests[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.payoutRequests[idx];
}

// ─── Enterprise: Automations ───
export function getAutomations() {
  return loadStore().automations || [];
}

export function createAutomation(data) {
  const store = loadStore();
  const rule = { id: newId(), active: true, createdAt: now(), ...data };
  store.automations.push(rule);
  saveStore(store);
  return rule;
}

export function updateAutomation(id, updates) {
  const store = loadStore();
  const idx = store.automations.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  store.automations[idx] = { ...store.automations[idx], ...updates, updatedAt: now() };
  saveStore(store);
  return store.automations[idx];
}

export function deleteAutomation(id) {
  const store = loadStore();
  store.automations = (store.automations || []).filter((a) => a.id !== id);
  saveStore(store);
}

// ─── Enterprise: Audit log (append-only) ───
export function logAudit({ userId, userName, action, entityType, entityId, details, meta = {} }) {
  const store = loadStore();
  if (!store.auditLog) store.auditLog = [];
  store.auditLog.unshift({
    id: newId(),
    userId: userId || 'system',
    userName: userName || 'System',
    action,
    entityType,
    entityId,
    details,
    meta,
    createdAt: now(),
  });
  if (store.auditLog.length > 5000) store.auditLog = store.auditLog.slice(0, 5000);
  saveStore(store);
}

export function getAuditLog(limit = 100) {
  return (loadStore().auditLog || []).slice(0, limit);
}

// ─── Enterprise: Team members (agency sub-accounts) ───
export function getTeamMembers(filter = {}) {
  let members = loadStore().teamMembers || [];
  if (filter.agencyId) members = members.filter((m) => m.agencyId === filter.agencyId);
  return members;
}

export function createTeamMember(data) {
  const store = loadStore();
  const member = { id: newId(), status: 'active', createdAt: now(), ...data };
  store.teamMembers.push(member);
  saveStore(store);
  return member;
}

export function deleteTeamMember(id) {
  const store = loadStore();
  store.teamMembers = (store.teamMembers || []).filter((m) => m.id !== id);
  saveStore(store);
}

// ─── Enterprise: Calendar events ───
export function getCalendarEvents(filter = {}) {
  const events = [];
  const leads = getLeads();
  leads.forEach((l) => {
    if (l.followUpDate) {
      events.push({
        id: `fu-${l.id}`,
        type: 'follow_up',
        title: `Follow-up: ${l.studentName || l.companyName || l.leadId}`,
        date: l.followUpDate,
        leadId: l.id,
        color: '#f59e0b',
      });
    }
  });
  getTasks().forEach((t) => {
    if (t.dueDate) {
      events.push({ id: `task-${t.id}`, type: 'task', title: t.title, date: t.dueDate, taskId: t.id, color: '#3b82f6' });
    }
  });
  getSessions().forEach((s) => {
    if (s.scheduledAt) {
      events.push({
        id: `sess-${s.id}`,
        type: 'session',
        title: s.title || 'Counselling Session',
        date: s.scheduledAt,
        sessionId: s.id,
        color: '#8b5cf6',
      });
    }
  });
  (loadStore().calendarNotes || []).forEach((n) => {
    events.push({
      id: `note-${n.id}`,
      type: 'note',
      title: n.title,
      date: n.date,
      notes: n.notes,
      color: '#10b981',
    });
  });

  let filtered = events;
  if (filter.from) filtered = filtered.filter((e) => String(e.date || '').slice(0, 10) >= filter.from);
  if (filter.to) filtered = filtered.filter((e) => String(e.date || '').slice(0, 10) <= filter.to);
  return filtered.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function createCalendarEvent({ type, title, date, leadId, notes, createdBy }) {
  if (type === 'follow_up') {
    if (!leadId) throw new Error('Select a lead for follow-up');
    const lead = updateLead(leadId, { followUpDate: date, ...(notes ? { adminNotes: notes } : {}) });
    if (!lead) throw new Error('Lead not found');
    return {
      id: `fu-${lead.id}`,
      type: 'follow_up',
      title: title || `Follow-up: ${lead.studentName || lead.companyName || lead.leadId}`,
      date,
      leadId: lead.id,
    };
  }

  if (type === 'note') {
    const store = loadStore();
    if (!store.calendarNotes) store.calendarNotes = [];
    const note = {
      id: newId(),
      title,
      date,
      notes: notes || '',
      createdBy,
      createdAt: now(),
    };
    store.calendarNotes.push(note);
    saveStore(store);
    return { id: `note-${note.id}`, type: 'note', title, date, notes };
  }

  // default: task
  const task = createTask({
    title,
    dueDate: date,
    notes: notes || '',
    createdBy,
    status: 'open',
  });
  return { id: `task-${task.id}`, type: 'task', title: task.title, date: task.dueDate, taskId: task.id };
}

export function deleteTask(id) {
  const store = loadStore();
  store.tasks = (store.tasks || []).filter((t) => t.id !== id);
  saveStore(store);
}

export function getEnterpriseDashboard() {
  const store = loadStore();
  const leads = getLeads();
  const payments = store.payments || [];
  const payouts = store.payoutRequests || [];
  const overdue = leads.filter((l) => l.followUpDate && l.followUpDate < new Date().toISOString().slice(0, 10) && !['completed', 'lost'].includes(normalizeLeadStatus(l.status)));
  return {
    totalRevenue: payments.filter((p) => p.status === 'received').reduce((s, p) => s + (p.amount || 0), 0),
    pendingPayouts: payouts.filter((p) => p.status === 'pending').length,
    pendingPayoutAmount: payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
    slaBreaches: overdue.length,
    activeAutomations: (store.automations || []).filter((a) => a.active).length,
    teamMembers: (store.teamMembers || []).length,
    agencies: store.users.filter((u) => u.role === 'partner' && (u.partnerType === 'agency' || u.partnerType === 'franchise')).length,
  };
}


// --- Partner activity log (calls / WhatsApp / meetings / notes) ---
export function getPartnerActivities(partnerId) {
  let list = loadStore().partnerActivities || [];
  if (partnerId) list = list.filter((a) => a.partnerId === partnerId);
  return sortByDate(list);
}

export function createPartnerActivity(data) {
  const store = loadStore();
  if (!store.partnerActivities) store.partnerActivities = [];
  const followUpDate = data.followUpDate ? String(data.followUpDate).slice(0, 10) : null;
  const row = {
    id: newId(),
    partnerId: data.partnerId,
    type: data.type || 'note',
    comment: (data.comment || '').trim(),
    at: data.at || now(),
    followUpDate,
    reminderFor: followUpDate ? (data.reminderFor || data.createdBy || null) : null,
    completed: false,
    completedAt: null,
    createdBy: data.createdBy || null,
    createdByName: data.createdByName || '',
    createdByRole: data.createdByRole || '',
    createdAt: now(),
    updatedAt: now(),
  };
  store.partnerActivities.unshift(row);
  saveStore(store);
  return row;
}

export function updatePartnerActivity(id, updates) {
  const store = loadStore();
  const idx = (store.partnerActivities || []).findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const allowed = ['type', 'comment', 'at', 'followUpDate', 'completed', 'reminderFor'];
  const patch = {};
  allowed.forEach((k) => { if (updates[k] !== undefined) patch[k] = updates[k]; });
  if (patch.followUpDate !== undefined) {
    patch.followUpDate = patch.followUpDate ? String(patch.followUpDate).slice(0, 10) : null;
    if (patch.followUpDate && !store.partnerActivities[idx].reminderFor) {
      patch.reminderFor = store.partnerActivities[idx].createdBy;
    }
  }
  if (patch.completed === true) patch.completedAt = now();
  if (patch.completed === false) patch.completedAt = null;
  store.partnerActivities[idx] = { ...store.partnerActivities[idx], ...patch, updatedAt: now() };
  saveStore(store);
  return store.partnerActivities[idx];
}

export function deletePartnerActivity(id) {
  const store = loadStore();
  const before = store.partnerActivities || [];
  const removed = before.find((a) => a.id === id);
  if (!removed) return null;
  store.partnerActivities = before.filter((a) => a.id !== id);
  saveStore(store);
  return removed;
}

// --- Agency projects (school visits / campaigns) ---
export function getAgencyProjects(partnerId) {
  let list = loadStore().agencyProjects || [];
  if (partnerId) list = list.filter((p) => p.partnerId === partnerId);
  return sortByDate(list);
}

export function enrichProject(project, leads = null) {
  const all = leads || getLeads({ partnerId: project.partnerId });
  const projLeads = all.filter((l) => l.projectId === project.id || (l.project || '').toLowerCase() === (project.name || '').toLowerCase());
  const stages = {};
  projLeads.forEach((l) => {
    const s = l.status || 'new';
    stages[s] = (stages[s] || 0) + 1;
  });
  const products = getAllocatedProductsForPartner(project.partnerId);
  const productPrices = products.map((prod) => {
    const resolved = resolveProductRate({
      productId: prod.id,
      partnerId: project.partnerId,
      projectId: project.id,
    });
    return {
      productId: prod.id,
      label: prod.label,
      costPrice: resolved?.costPrice ?? prod.costPrice ?? 0,
      sellingPrice: resolved?.sellingPrice ?? prod.defaultSellingPrice ?? 0,
      commission: resolved?.commission || prod.commission,
    };
  });
  return {
    ...project,
    leadCount: projLeads.length,
    stages,
    converted: projLeads.filter((l) => ['converted', 'completed'].includes(l.status)).length,
    productPrices,
  };
}

export function createAgencyProject(data) {
  const store = loadStore();
  if (!store.agencyProjects) store.agencyProjects = [];
  const row = {
    id: newId(),
    partnerId: data.partnerId,
    name: (data.name || '').trim(),
    description: (data.description || '').trim(),
    createdBy: data.createdBy || null,
    createdByName: data.createdByName || '',
    createdAt: now(),
    updatedAt: now(),
  };
  store.agencyProjects.unshift(row);
  saveStore(store);
  return enrichProject(row);
}

export function updateAgencyProject(id, updates) {
  const store = loadStore();
  const idx = (store.agencyProjects || []).findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const patch = {};
  if (updates.name !== undefined) patch.name = String(updates.name).trim();
  if (updates.description !== undefined) patch.description = String(updates.description).trim();
  store.agencyProjects[idx] = { ...store.agencyProjects[idx], ...patch, updatedAt: now() };
  // Keep lead.project string in sync when renamed
  if (patch.name) {
    store.leads.forEach((l) => {
      if (l.projectId === id) l.project = patch.name;
    });
  }
  saveStore(store);
  return enrichProject(store.agencyProjects[idx]);
}

export function deleteAgencyProject(id) {
  const store = loadStore();
  const removed = (store.agencyProjects || []).find((p) => p.id === id);
  if (!removed) return null;
  store.agencyProjects = store.agencyProjects.filter((p) => p.id !== id);
  store.leads.forEach((l) => {
    if (l.projectId === id) { l.projectId = null; l.project = null; }
  });
  saveStore(store);
  return removed;
}

export function assignLeadsToProject(projectId, leadIds = []) {
  const project = (loadStore().agencyProjects || []).find((p) => p.id === projectId);
  if (!project) throw new Error('Project not found');
  const updated = [];
  for (const lid of leadIds) {
    const lead = updateLead(lid, { projectId, project: project.name });
    if (lead) updated.push(lead);
  }
  return { project: enrichProject(project), leads: updated };
}
