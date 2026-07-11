import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as db from '../lib/db.js';
import { PARTNER_TYPES } from '../lib/db.js';
import { LEAD_STATUSES } from '../models/Lead.js';
import { authRequired, loadUser, adminOnly } from '../middleware/auth.js';
import { generateReferralCode, generateLeadId, notifyUser, partnerTypeLabel, generateLoginId, isValidLoginId, normalizeLoginId, generateFranchiseCode } from '../utils/helpers.js';

const router = Router();

router.use(authRequired, loadUser, adminOnly);

router.get('/dashboard', (req, res) => {
  const partners = db.queryUsers();
  const leads = db.getLeads();
  const commissions = db.getCommissions();

  const activePartners = partners.filter((p) => p.status === 'active').length;
  const pendingPartners = partners.filter((p) => p.status === 'pending').length;
  const statusCounts = LEAD_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  const partnerTypeCounts = PARTNER_TYPES.reduce((acc, t) => {
    acc[t] = partners.filter((p) => p.partnerType === t && p.status === 'active').length;
    return acc;
  }, {});

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthTs = thisMonth.getTime();
  const leadsThisMonth = leads.filter((l) => new Date(l.createdAt).getTime() >= monthTs).length;
  const convertedThisMonth = leads.filter(
    (l) => l.status === 'converted' && new Date(l.updatedAt).getTime() >= monthTs
  ).length;

  const recentLeads = leads.slice(0, 8).map(db.populateLead);
  const topPartners = partners
    .filter((p) => p.status === 'active')
    .sort((a, b) => (b.totalLeads || 0) - (a.totalLeads || 0))
    .slice(0, 5)
    .map(db.userToSafeJSON);

  res.json({
    stats: {
      totalPartners: partners.length,
      activePartners,
      pendingPartners,
      totalLeads: leads.length,
      convertedLeads: statusCounts.converted || 0,
      leadsThisMonth,
      convertedThisMonth,
      pendingCommissions: commissions.filter((c) => c.status === 'pending').length,
      totalCommissionPaid: commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0),
      statusCounts,
      partnerTypeCounts,
    },
    recentLeads,
    topPartners,
    monthlyTrends: db.getMonthlyTrends(6),
    followUpCounts: {
      overdue: db.getFollowUps({ overdue: true }).length,
      upcoming: db.getFollowUps({ upcoming: true }).length,
    },
    recentActivity: db.getActivities(10),
  });
});

router.get('/partners', (req, res) => {
  const { status, partnerType, search } = req.query;
  const partners = db.queryUsers({ status, partnerType, search }).map(db.userToSafeJSON);
  res.json({ partners });
});

router.post('/partners', async (req, res) => {
  const {
    name, email, phone, password, loginId: rawLoginId, partnerType, organization,
    city, state, address, commissionRate, status, notes,
    franchiseName, territory, outletCount, investmentTier, operatingModel, royaltyPercent, agreementDate,
  } = req.body;

  if (!name?.trim() || !email?.trim() || !partnerType || !password) {
    return res.status(400).json({ message: 'Name, email, partner type and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  if (!PARTNER_TYPES.includes(partnerType)) {
    return res.status(400).json({ message: 'Invalid partner type' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (db.findUser({ email: normalizedEmail })) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  let loginId = rawLoginId ? normalizeLoginId(rawLoginId) : generateLoginId(partnerType);
  if (!isValidLoginId(loginId)) {
    return res.status(400).json({ message: 'Partner ID must be 4–20 characters (letters, numbers, dash, underscore)' });
  }
  if (db.findUser({ loginId })) {
    return res.status(409).json({ message: 'Partner ID already taken. Choose another.' });
  }

  const hash = await bcrypt.hash(password, 10);
  let referralCode = generateReferralCode(name);
  while (db.findUser({ referralCode })) referralCode = generateReferralCode(name);

  const partner = db.createUser({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || '',
    password: hash,
    role: 'partner',
    partnerType,
    loginId,
    organization: organization?.trim() || '',
    city: city?.trim() || '',
    state: state?.trim() || '',
    address: address?.trim() || '',
    referralCode,
    status: status || 'active',
    commissionRate: partnerType === 'franchise' ? (Number(commissionRate) || 15) : (Number(commissionRate) || 10),
    tier: partnerType === 'franchise' ? (req.body.tier || 'gold') : (req.body.tier || 'bronze'),
    notes: notes?.trim() || '',
    createdBy: req.user.id,
    accountCreatedByAdmin: true,
    welcomePending: true,
    ...(partnerType === 'franchise' ? {
      franchiseName: franchiseName?.trim() || organization?.trim() || name.trim(),
      territory: territory?.trim() || city?.trim() || '',
      outletCount: Number(outletCount) || 1,
      investmentTier: investmentTier || 'starter',
      operatingModel: operatingModel || 'single_outlet',
      franchiseCode: generateFranchiseCode(territory || city || name),
      royaltyPercent: Number(royaltyPercent) || (investmentTier === 'flagship' ? 5 : investmentTier === 'growth' ? 6 : 8),
      agreementDate: agreementDate || new Date().toISOString().slice(0, 10),
    } : {}),
  });

  db.logActivity({
    userId: req.user.id,
    userName: req.user.name,
    action: 'partner_created',
    entityType: 'partner',
    entityId: partner.id,
    details: `${partner.name} (${loginId})`,
  });

  if (partner.status === 'active') {
    await notifyUser(partner.id, {
      title: 'Your Dream Mantra partner account is ready',
      message: `Sign in with Partner ID "${loginId}" or ${normalizedEmail}. Change your password after first login.`,
      type: 'partner',
      link: '/partner',
    });
  }

  res.status(201).json({
    partner: db.userToSafeJSON(partner),
    credentials: {
      loginId,
      email: normalizedEmail,
      password,
      referralCode,
      loginUrl: '/login',
    },
  });
});

router.patch('/partners/:id', async (req, res) => {
  const partner = db.findUser({ id: req.params.id });
  if (!partner || partner.role !== 'partner') return res.status(404).json({ message: 'Partner not found' });

  const prevStatus = partner.status;
  const updates = {};
  const fields = ['name', 'phone', 'partnerType', 'organization', 'city', 'state', 'address', 'status', 'notes', 'tier', 'documentsVerified', 'bankAccount', 'ifsc', 'upiId', 'panNumber', 'franchiseName', 'territory', 'investmentTier', 'operatingModel', 'agreementDate'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  if (req.body.outletCount !== undefined) updates.outletCount = Number(req.body.outletCount);
  if (req.body.royaltyPercent !== undefined) updates.royaltyPercent = Number(req.body.royaltyPercent);
  if (req.body.loginId !== undefined) {
    const loginId = normalizeLoginId(req.body.loginId);
    if (!isValidLoginId(loginId)) {
      return res.status(400).json({ message: 'Invalid Partner ID format' });
    }
    const taken = db.findUser({ loginId });
    if (taken && taken.id !== partner.id) {
      return res.status(409).json({ message: 'Partner ID already in use' });
    }
    updates.loginId = loginId;
  }
  if (req.body.commissionRate !== undefined) updates.commissionRate = Number(req.body.commissionRate);
  if (req.body.email !== undefined) {
    const email = req.body.email.trim().toLowerCase();
    const taken = db.findUser({ email });
    if (taken && taken.id !== partner.id) return res.status(409).json({ message: 'Email already in use' });
    updates.email = email;
  }
  if (req.body.totalLeads !== undefined) updates.totalLeads = Number(req.body.totalLeads);
  if (req.body.convertedLeads !== undefined) updates.convertedLeads = Number(req.body.convertedLeads);
  if (req.body.totalEarnings !== undefined) updates.totalEarnings = Number(req.body.totalEarnings);

  const updated = db.updateUser(partner.id, updates);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'partner_updated', entityType: 'partner', entityId: partner.id, details: updates.status || partner.name });

  if (prevStatus !== 'active' && updated.status === 'active') {
    await notifyUser(updated.id, { title: 'Account approved!', message: 'Your partner account is now active.', type: 'partner', link: '/partner' });
  }
  if (updated.status === 'suspended') {
    await notifyUser(updated.id, { title: 'Account suspended', message: req.body.suspendReason || 'Contact admin for details.', type: 'partner' });
  }

  res.json({ partner: db.userToSafeJSON(updated) });
});

router.get('/partners/:id', (req, res) => {
  const detail = db.getPartnerDetail(req.params.id);
  if (!detail) return res.status(404).json({ message: 'Partner not found' });
  res.json(detail);
});

router.delete('/partners/:id', (req, res) => {
  const partner = db.deletePartner(req.params.id);
  if (!partner) return res.status(404).json({ message: 'Partner not found' });
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'partner_deleted', entityType: 'partner', entityId: req.params.id, details: partner.name });
  res.json({ ok: true });
});

router.post('/partners/:id/reset-password', async (req, res) => {
  const partner = db.findUser({ id: req.params.id });
  if (!partner || partner.role !== 'partner') return res.status(404).json({ message: 'Partner not found' });
  const pwd = req.body.password || 'Partner@123';
  const hash = await bcrypt.hash(pwd, 10);
  db.updateUser(partner.id, { password: hash });
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'password_reset', entityType: 'partner', entityId: partner.id });
  res.json({
    message: 'Password reset',
    credentials: {
      loginId: partner.loginId,
      email: partner.email,
      password: pwd,
    },
    tempPassword: pwd,
  });
});

router.post('/partners/:id/recalculate', (req, res) => {
  const updated = db.recalculatePartnerStats(req.params.id);
  if (!updated) return res.status(404).json({ message: 'Partner not found' });
  res.json({ partner: db.userToSafeJSON(updated) });
});

router.post('/partners/bulk', async (req, res) => {
  const { ids, action, data = {} } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids array required' });
  let result = [];
  if (action === 'approve') result = db.bulkUpdatePartners(ids, { status: 'active' });
  else if (action === 'suspend') result = db.bulkUpdatePartners(ids, { status: 'suspended' });
  else if (action === 'reject') result = db.bulkUpdatePartners(ids, { status: 'rejected' });
  else if (action === 'set_tier') result = db.bulkUpdatePartners(ids, { tier: data.tier });
  else if (action === 'set_commission') result = db.bulkUpdatePartners(ids, { commissionRate: Number(data.commissionRate) });
  else return res.status(400).json({ message: 'Invalid action' });
  for (const p of result) {
    if (action === 'approve') await notifyUser(p.id, { title: 'Account approved!', message: 'Your partner account is now active.', type: 'partner', link: '/partner' });
  }
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: `bulk_${action}`, entityType: 'partner', details: `${ids.length} partners` });
  res.json({ updated: result.length });
});

router.get('/leads', (req, res) => {
  const { status, partnerId, search, priority, city } = req.query;
  let leads = db.getLeads({ status, search, priority, city });
  if (partnerId && partnerId !== 'all') leads = leads.filter((l) => l.partnerId === partnerId);
  res.json({ leads: leads.map(db.populateLead), total: leads.length, page: 1, pages: 1 });
});

router.post('/leads', async (req, res) => {
  const { partnerId, ...leadData } = req.body;
  const partner = db.findUser({ id: partnerId });
  if (!partner || partner.role !== 'partner') return res.status(404).json({ message: 'Partner not found' });
  if (!leadData.studentName?.trim() || !leadData.studentPhone?.trim()) {
    return res.status(400).json({ message: 'Student name and phone are required' });
  }

  let leadId = generateLeadId();
  while (db.getLeads().find((l) => l.leadId === leadId)) leadId = generateLeadId();

  const lead = db.createLead({
    ...leadData,
    leadId,
    studentName: leadData.studentName.trim(),
    studentPhone: leadData.studentPhone.trim(),
    partnerId: partner.id,
    partnerName: partner.name,
    partnerType: partner.partnerType,
    status: leadData.status || 'new',
    statusHistory: [{
      status: leadData.status || 'new',
      note: 'Lead created by admin',
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      createdAt: new Date().toISOString(),
    }],
  });

  db.updateUser(partner.id, { totalLeads: (partner.totalLeads || 0) + 1 });
  await notifyUser(partner.id, {
    title: 'New lead assigned',
    message: `Admin added a lead for ${lead.studentName} under your account.`,
    type: 'lead_update',
    link: '/partner?tab=leads',
    meta: { leadId: lead.id },
  });

  res.status(201).json({ lead: db.populateLead(lead) });
});

router.patch('/leads/:id', async (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const partner = db.findUser({ id: lead.partnerId });
  const prevStatus = lead.status;
  const updates = {};
  const {
    status, adminNotes, priority, followUpDate, expectedValue,
    commissionAmount, commissionPaid, note, tags, assignedTo,
  } = req.body;

  if (status && status !== prevStatus) {
    updates.status = status;
    const history = [...(lead.statusHistory || [])];
    history.push({
      status,
      note: note || `Status changed to ${status}`,
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      createdAt: new Date().toISOString(),
    });
    updates.statusHistory = history;

    await notifyUser(lead.partnerId, {
      title: 'Lead status updated',
      message: `Lead ${lead.studentName} (${lead.leadId}) is now: ${status.replace(/_/g, ' ')}`,
      type: 'lead_update',
      link: '/partner?tab=leads',
      meta: { leadId: lead.id, status },
    });

    if (status === 'converted' && prevStatus !== 'converted') {
      db.updateUser(lead.partnerId, { convertedLeads: (partner.convertedLeads || 0) + 1 });
      const amount = commissionAmount ?? Math.round((expectedValue || lead.expectedValue || 5000) * ((partner.commissionRate || 10) / 100));
      updates.commissionAmount = amount;
      const commission = db.createCommission({
        partnerId: lead.partnerId,
        leadId: lead.id,
        amount,
        rate: partner.commissionRate || 10,
        status: 'pending',
        createdBy: req.user.id,
      });
      await notifyUser(lead.partnerId, {
        title: 'Commission earned!',
        message: `₹${amount} commission pending for converted lead ${lead.studentName}`,
        type: 'commission',
        link: '/partner?tab=commissions',
        meta: { commissionId: commission.id },
      });
    }
  }

  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  if (priority) updates.priority = priority;
  if (followUpDate !== undefined) updates.followUpDate = followUpDate || null;
  if (expectedValue !== undefined) updates.expectedValue = Number(expectedValue);
  if (commissionAmount !== undefined) updates.commissionAmount = Number(commissionAmount);
  if (commissionPaid !== undefined) updates.commissionPaid = commissionPaid;
  if (tags) updates.tags = tags;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;

  const updated = db.updateLead(lead.id, updates);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'lead_updated', entityType: 'lead', entityId: lead.id, details: updates.status || 'updated' });
  res.json({ lead: db.populateLead(updated) });
});

router.put('/leads/:id', async (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  const allowed = [
    'studentName', 'studentPhone', 'studentEmail', 'parentName', 'parentPhone',
    'classGrade', 'stream', 'city', 'state', 'pincode', 'schoolCollege',
    'interestedIn', 'notes', 'priority', 'gender', 'dateOfBirth', 'budget',
    'preferredContactTime', 'whatsappOptIn', 'expectedValue', 'adminNotes', 'tags',
  ];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const updated = db.updateLead(lead.id, updates);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'lead_edited', entityType: 'lead', entityId: lead.id, details: lead.studentName });
  res.json({ lead: db.populateLead(updated) });
});

router.delete('/leads/:id', (req, res) => {
  const lead = db.deleteLead(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'lead_deleted', entityType: 'lead', entityId: req.params.id, details: lead.studentName });
  res.json({ ok: true });
});

router.post('/leads/:id/transfer', async (req, res) => {
  try {
    const updated = db.transferLead(req.params.id, req.body.partnerId);
    await notifyUser(req.body.partnerId, { title: 'Lead transferred to you', message: `Lead ${updated.studentName} assigned to your account.`, type: 'lead_update', link: '/partner?tab=leads' });
    db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'lead_transferred', entityType: 'lead', entityId: req.params.id });
    res.json({ lead: db.populateLead(updated) });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.post('/leads/bulk-action', async (req, res) => {
  const { ids, status, priority, followUpDate } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids required' });
  const updates = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (followUpDate !== undefined) updates.followUpDate = followUpDate || null;
  const results = [];
  for (const id of ids) {
    const lead = db.findLead(id);
    if (!lead) continue;
    const leadUpdates = { ...updates };
    if (status && status !== lead.status) {
      const history = [...(lead.statusHistory || [])];
      history.push({ status, note: 'Bulk update by admin', updatedBy: req.user.id, updatedByName: req.user.name, createdAt: new Date().toISOString() });
      leadUpdates.statusHistory = history;
      await notifyUser(lead.partnerId, { title: 'Lead status updated', message: `${lead.studentName} is now ${status.replace(/_/g, ' ')}`, type: 'lead_update', link: '/partner?tab=leads' });
    }
    results.push(db.updateLead(id, leadUpdates));
  }
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'bulk_lead_update', entityType: 'lead', details: `${ids.length} leads` });
  res.json({ updated: results.filter(Boolean).length });
});

router.get('/commissions', (req, res) => {
  const { status } = req.query;
  const commissions = db.getCommissions({ status }).map(db.populateCommission);
  res.json({ commissions });
});

router.patch('/commissions/:id', async (req, res) => {
  const commission = db.getCommissions().find((c) => c.id === req.params.id);
  if (!commission) return res.status(404).json({ message: 'Commission not found' });

  const { status, paymentReference, notes } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (paymentReference !== undefined) updates.paymentReference = paymentReference;
  if (notes !== undefined) updates.notes = notes;
  if (req.body.amount !== undefined) updates.amount = Number(req.body.amount);

  if (status === 'paid') {
    updates.paidAt = new Date().toISOString();
    const partner = db.findUser({ id: commission.partnerId });
    db.updateUser(commission.partnerId, { totalEarnings: (partner.totalEarnings || 0) + commission.amount });
    db.updateLead(commission.leadId, { commissionPaid: true });
    await notifyUser(commission.partnerId, {
      title: 'Commission paid',
      message: `₹${commission.amount} has been marked as paid.`,
      type: 'commission',
      link: '/partner?tab=commissions',
    });
  }

  const updated = db.updateCommission(commission.id, updates);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'commission_updated', entityType: 'commission', entityId: commission.id, details: status });
  res.json({ commission: db.populateCommission(updated) });
});

router.post('/commissions', (req, res) => {
  const { partnerId, leadId, amount, rate, notes } = req.body;
  if (!partnerId || !leadId || !amount) return res.status(400).json({ message: 'partnerId, leadId, amount required' });
  const commission = db.createCommission({
    partnerId, leadId, amount: Number(amount), rate: Number(rate) || 10,
    status: 'pending', notes: notes || '', createdBy: req.user.id,
  });
  notifyUser(partnerId, { title: 'Commission added', message: `₹${amount} commission added by admin.`, type: 'commission', link: '/partner?tab=commissions' });
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'commission_created', entityType: 'commission', entityId: commission.id });
  res.status(201).json({ commission: db.populateCommission(commission) });
});

router.delete('/commissions/:id', (req, res) => {
  const c = db.deleteCommission(req.params.id);
  if (!c) return res.status(404).json({ message: 'Not found' });
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'commission_deleted', entityType: 'commission', entityId: req.params.id });
  res.json({ ok: true });
});

router.post('/commissions/bulk-action', async (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !status) return res.status(400).json({ message: 'ids and status required' });
  let count = 0;
  for (const id of ids) {
    const commission = db.getCommissions().find((c) => c.id === id);
    if (!commission) continue;
    const updates = { status };
    if (status === 'paid') {
      updates.paidAt = new Date().toISOString();
      const partner = db.findUser({ id: commission.partnerId });
      db.updateUser(commission.partnerId, { totalEarnings: (partner.totalEarnings || 0) + commission.amount });
      db.updateLead(commission.leadId, { commissionPaid: true });
      await notifyUser(commission.partnerId, { title: 'Commission paid', message: `₹${commission.amount} marked as paid.`, type: 'commission', link: '/partner?tab=commissions' });
    }
    db.updateCommission(id, updates);
    count++;
  }
  res.json({ updated: count });
});

router.get('/meta', (_req, res) => {
  res.json({ partnerTypes: PARTNER_TYPES, leadStatuses: LEAD_STATUSES, partnerTiers: db.PARTNER_TIERS });
});

router.get('/reports', (req, res) => {
  const leads = db.getLeads();
  const partners = db.queryUsers({ status: 'active' });
  const converted = leads.filter((l) => l.status === 'converted').length;
  res.json({
    monthlyTrends: db.getMonthlyTrends(12),
    conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
    funnel: LEAD_STATUSES.map((s) => ({ status: s, count: leads.filter((l) => l.status === s).length })),
    partnerPerformance: partners.slice(0, 20).map((p) => ({
      ...db.userToSafeJSON(p),
      conversionRate: p.totalLeads ? Math.round((p.convertedLeads / p.totalLeads) * 100) : 0,
    })),
    revenuePipeline: leads.filter((l) => !['converted', 'lost'].includes(l.status)).reduce((s, l) => s + (l.expectedValue || 0), 0),
  });
});

router.get('/activity', (req, res) => {
  res.json({ activities: db.getActivities(Number(req.query.limit) || 50) });
});

router.get('/follow-ups', (req, res) => {
  res.json({
    overdue: db.getFollowUps({ overdue: true }),
    upcoming: db.getFollowUps({ upcoming: true }),
    today: db.getFollowUps({}).filter((l) => {
      const d = new Date(l.followUpDate);
      const t = new Date();
      return d.toDateString() === t.toDateString();
    }),
  });
});

router.get('/announcements', (_req, res) => {
  res.json({ announcements: db.getAnnouncements(false) });
});

router.post('/announcements', (req, res) => {
  const { title, message, audience } = req.body;
  if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: 'Title and message required' });
  const item = db.createAnnouncement({ title, message, audience: audience || 'all', createdBy: req.user.name });
  const partners = db.queryUsers({ status: 'active' });
  partners.forEach((p) => {
    notifyUser(p.id, { title: `📢 ${title}`, message, type: 'system', link: '/partner' });
  });
  res.status(201).json({ announcement: item });
});

router.patch('/announcements/:id', (req, res) => {
  const item = db.updateAnnouncement(req.params.id, req.body);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json({ announcement: item });
});

router.delete('/announcements/:id', (req, res) => {
  db.deleteAnnouncement(req.params.id);
  res.json({ ok: true });
});

router.post('/notify', async (req, res) => {
  const { partnerId, title, message, link } = req.body;
  if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: 'title and message required' });
  if (partnerId && partnerId !== 'all') {
    await notifyUser(partnerId, { title, message, type: 'system', link: link || '/partner' });
    res.json({ sent: 1 });
  } else {
    const partners = db.queryUsers({ status: 'active' });
    await Promise.all(partners.map((p) => notifyUser(p.id, { title, message, type: 'system', link: link || '/partner' })));
    res.json({ sent: partners.length });
  }
});

router.get('/duplicates', (_req, res) => {
  res.json({ groups: db.getAllDuplicateGroups() });
});

router.get('/franchises', (_req, res) => {
  res.json({ franchises: db.getFranchises() });
});

router.get('/search', (req, res) => {
  const q = req.query.q || '';
  res.json(db.globalSearch(q, Number(req.query.limit) || 12));
});

router.get('/system', (_req, res) => {
  res.json({ stats: db.getSystemStats(), settings: db.getSettings() });
});

router.get('/settings', (_req, res) => {
  res.json({ settings: db.getSettings() });
});

router.put('/settings', (req, res) => {
  res.json({ settings: db.updateSettings(req.body) });
});

router.get('/export/leads', (req, res) => {
  const csv = db.exportLeadsCSV({ status: req.query.status, search: req.query.search, partnerId: req.query.partnerId });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=all-leads.csv');
  res.send(csv);
});

router.get('/export/partners', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=partners.csv');
  res.send(db.exportPartnersCSV());
});

router.get('/export/commissions', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=commissions.csv');
  res.send(db.exportCommissionsCSV());
});

router.get('/export/registrations', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=registrations.csv');
  res.send(db.exportRegistrationsCSV({ status: req.query.status }));
});

router.get('/export/activities', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=activity-log.csv');
  res.send(db.exportActivitiesCSV());
});

router.get('/export/announcements', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=announcements.csv');
  res.send(db.exportAnnouncementsCSV());
});

router.get('/export/backup', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=dreammantra-crm-backup-${Date.now()}.json`);
  res.json(db.exportFullBackup());
});

// ─── Form templates ───
router.get('/forms', (_req, res) => {
  res.json({ templates: db.getFormTemplates() });
});

router.put('/forms', (req, res) => {
  const templates = db.updateFormTemplates(req.body.templates || req.body);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'forms_updated', entityType: 'settings', details: 'Form templates saved' });
  res.json({ templates });
});

// ─── Registrations (partner signups) ───
router.get('/registrations', (req, res) => {
  const { status } = req.query;
  res.json({ registrations: db.getRegistrations({ status: status || 'all' }) });
});

router.put('/registrations/:id', async (req, res) => {
  const partner = db.findUser({ id: req.params.id });
  if (!partner || partner.role !== 'partner') return res.status(404).json({ message: 'Registration not found' });
  const updates = {};
  const fields = ['name', 'phone', 'partnerType', 'organization', 'city', 'state', 'address', 'status', 'notes', 'franchiseName', 'territory', 'investmentTier', 'operatingModel'];
  fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.body.email) {
    const email = req.body.email.trim().toLowerCase();
    const taken = db.findUser({ email });
    if (taken && taken.id !== partner.id) return res.status(409).json({ message: 'Email already in use' });
    updates.email = email;
  }
  if (req.body.outletCount !== undefined) updates.outletCount = Number(req.body.outletCount);
  const updated = db.updateUser(partner.id, updates);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'registration_edited', entityType: 'partner', entityId: partner.id });
  res.json({ registration: db.userToSafeJSON(updated) });
});

router.delete('/registrations/:id', (req, res) => {
  const partner = db.deletePartner(req.params.id);
  if (!partner) return res.status(404).json({ message: 'Registration not found' });
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'registration_deleted', entityType: 'partner', entityId: req.params.id });
  res.json({ ok: true });
});

// ─── Comments & notifications ───
router.get('/comments', (_req, res) => {
  res.json({ comments: db.getAllComments() });
});

router.patch('/comments/:id', (req, res) => {
  const comment = db.updateLeadComment(req.params.id, { message: req.body.message, isInternal: req.body.isInternal });
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  res.json({ comment });
});

router.delete('/comments/:id', (req, res) => {
  if (!db.deleteLeadComment(req.params.id)) return res.status(404).json({ message: 'Comment not found' });
  res.json({ ok: true });
});

router.get('/notifications', (_req, res) => {
  res.json({ notifications: db.getAllNotifications() });
});

router.delete('/notifications/:id', (req, res) => {
  db.deleteNotification(req.params.id);
  res.json({ ok: true });
});

router.delete('/activities', (req, res) => {
  db.clearActivities();
  res.json({ ok: true, message: 'Activity log cleared' });
});

router.post('/leads/bulk', (req, res) => {
  const { partnerId, leads: leadsData } = req.body;
  if (!partnerId || !Array.isArray(leadsData)) return res.status(400).json({ message: 'partnerId and leads array required' });
  const created = db.bulkCreateLeads(leadsData, partnerId, req.user);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'bulk_import', entityType: 'lead', details: `${created.length} leads for partner` });
  res.json({ created: created.length });
});

router.get('/leads/:id/comments', (req, res) => {
  res.json({ comments: db.getLeadComments(req.params.id) });
});

router.post('/leads/:id/comments', (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  const comment = db.addLeadComment({
    leadId: req.params.id,
    userId: req.user.id,
    userName: req.user.name,
    role: 'admin',
    message: req.body.message,
    isInternal: !!req.body.isInternal,
  });
  if (!req.body.isInternal) {
    notifyUser(lead.partnerId, { title: 'New message on lead', message: req.body.message, type: 'lead_update', link: '/partner?tab=leads' });
  }
  res.status(201).json({ comment });
});

export default router;
