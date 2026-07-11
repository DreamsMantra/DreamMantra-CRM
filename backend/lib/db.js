import bcrypt from 'bcryptjs';
import { loadStore, saveStore, newId, now, findById, sortByDate } from '../lib/store.js';
import { generateReferralCode, generateLoginId, normalizeLoginId } from '../utils/helpers.js';

export const PARTNER_TIERS = ['bronze', 'silver', 'gold', 'platinum'];

export const PARTNER_TYPES = [
  'referral_partner', 'teacher', 'school', 'college', 'coaching_center', 'influencer', 'counsellor',
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
  if (query.role === 'admin') return users.find((u) => u.role === 'admin') || null;
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
  const existing = findUser({ role: 'admin' });
  if (existing) return existing;
  const email = (process.env.ADMIN_EMAIL || 'admin@dreammantra.in').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  const admin = createUser({
    name: process.env.ADMIN_NAME || 'Dream Mantra Admin',
    email,
    phone: '9680102276',
    password: hash,
    role: 'admin',
    status: 'active',
    referralCode: generateReferralCode('ADM'),
    partnerType: null,
  });
  console.log(`✓ Admin seeded: ${email}`);
  return admin;
}

export function getLeads(filter = {}) {
  let leads = loadStore().leads;
  if (filter.partnerId) leads = leads.filter((l) => l.partnerId === filter.partnerId);
  if (filter.status && filter.status !== 'all') leads = leads.filter((l) => l.status === filter.status);
  if (filter.priority && filter.priority !== 'all') leads = leads.filter((l) => l.priority === filter.priority);
  if (filter.city && filter.city !== 'all') leads = leads.filter((l) => (l.city || '').toLowerCase().includes(filter.city.toLowerCase()));
  if (filter.search) {
    const q = filter.search.toLowerCase();
    leads = leads.filter(
      (l) =>
        (l.studentName || '').toLowerCase().includes(q) ||
        (l.studentPhone || '').includes(q) ||
        (l.leadId || '').toLowerCase().includes(q) ||
        (l.partnerName || '').toLowerCase().includes(q)
    );
  }
  return sortByDate(leads);
}

export function findLead(id) {
  return findById(loadStore().leads, id);
}

export function createLead(data) {
  const store = loadStore();
  const lead = { id: newId(), ...data, createdAt: now(), updatedAt: now() };
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

  let leads = loadStore().leads.filter((l) => l.followUpDate && !['converted', 'lost'].includes(l.status));
  if (filter.overdue) {
    leads = leads.filter((l) => new Date(l.followUpDate) < today);
  } else if (filter.upcoming) {
    leads = leads.filter((l) => {
      const d = new Date(l.followUpDate);
      return d >= today && d <= weekLater;
    });
  }
  if (filter.partnerId) leads = leads.filter((l) => l.partnerId === filter.partnerId);
  return sortByDate(leads.map((l) => ({ ...populateLead(l), followUpDate: l.followUpDate })), 'followUpDate', false);
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
      leadId: data.leadId || `DM-${new Date().getFullYear()}-${newId().slice(0, 6).toUpperCase()}`,
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
  return {
    partner: userToSafeJSON(partner),
    leads: leads.map((l) => ({ ...l, _id: l.id })),
    commissions: commissions.map(populateCommission),
    stats: {
      totalLeads: leads.length,
      converted: leads.filter((l) => l.status === 'converted').length,
      pendingCommission: commissions.filter((c) => c.status === 'pending' || c.status === 'approved').reduce((s, c) => s + c.amount, 0),
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
    leads: store.leads.length,
    commissions: store.commissions.length,
    notifications: store.notifications.length,
    activities: store.activities.length,
    announcements: store.announcements.length,
  };
}
