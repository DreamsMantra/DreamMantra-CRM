import { Router } from 'express';
import * as db from '../lib/db.js';
import { LEAD_STATUSES } from '../models/Lead.js';
import { authRequired, loadUser, partnerOnly, activePartnerOnly } from '../middleware/auth.js';
import { generateLeadId, notifyUser } from '../utils/helpers.js';
import { normalizeLeadInput } from '../utils/leadHelpers.js';

const router = Router();

router.use(authRequired, loadUser, partnerOnly);

router.patch('/welcome-seen', (req, res) => {
  const user = db.updateUser(req.user.id, { welcomePending: false });
  res.json({ user: db.userToSafeJSON(user) });
});

router.patch('/agency-onboarding', activePartnerOnly, (req, res) => {
  if (!['agency', 'franchise'].includes(req.user.partnerType)) {
    return res.status(403).json({ message: 'Agency hub is only for agency partners' });
  }
  const updated = db.updateAgencyOnboarding(req.user.id, req.body);
  res.json({ onboarding: updated.agencyOnboarding });
});

router.patch('/franchise-onboarding', activePartnerOnly, (req, res) => {
  if (!['agency', 'franchise'].includes(req.user.partnerType)) {
    return res.status(403).json({ message: 'Agency hub is only for agency partners' });
  }
  const updated = db.updateAgencyOnboarding(req.user.id, req.body);
  res.json({ onboarding: updated.agencyOnboarding });
});

router.get('/agency-hub', activePartnerOnly, (req, res) => {
  if (!['agency', 'franchise'].includes(req.user.partnerType)) {
    return res.status(403).json({ message: 'Agency hub is only for agency partners' });
  }
  const data = db.getAgencyHubData(req.user.id);
  if (!data) return res.status(404).json({ message: 'Agency data not found' });
  res.json(data);
});

router.get('/franchise-hub', activePartnerOnly, (req, res) => {
  if (!['agency', 'franchise'].includes(req.user.partnerType)) {
    return res.status(403).json({ message: 'Agency hub is only for agency partners' });
  }
  const data = db.getAgencyHubData(req.user.id);
  if (!data) return res.status(404).json({ message: 'Agency data not found' });
  res.json(data);
});

router.get('/dashboard', activePartnerOnly, (req, res) => {
  const leads = db.getLeads({ partnerId: req.user.id });
  const commissions = db.getCommissions({ partnerId: req.user.id });

  const statusCounts = LEAD_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  const pendingCommission = commissions
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);
  const paidCommission = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  res.json({
    stats: {
      totalLeads: leads.length,
      converted: statusCounts.converted || 0,
      inProgress: leads.filter((l) => !['converted', 'lost'].includes(l.status)).length,
      pendingCommission,
      paidCommission,
      statusCounts,
    },
    recentLeads: leads.slice(0, 5).map((l) => ({ ...l, _id: l.id })),
    user: db.userToSafeJSON(req.user),
  });
});

router.get('/leads', activePartnerOnly, (req, res) => {
  const { status, search, leadType } = req.query;
  const leads = db.getLeads({ partnerId: req.user.id, status, search, leadType }).map((l) => ({ ...l, _id: l.id }));
  res.json({ leads, total: leads.length, page: 1, pages: 1 });
});

router.post('/leads', activePartnerOnly, async (req, res) => {
  try {
    const normalized = normalizeLeadInput(req.body);

    const phone = normalized.contactPhone || normalized.studentPhone;
    const duplicates = db.findDuplicateLeads(phone);
    if (duplicates.length) {
      return res.status(409).json({
        message: 'A lead with this phone number already exists',
        duplicates: duplicates.map((d) => ({ leadId: d.leadId, studentName: d.studentName, status: d.status })),
      });
    }

    let leadId = generateLeadId();
    while (db.getLeads().find((l) => l.leadId === leadId)) leadId = generateLeadId();

    const lead = db.createLead({
      ...normalized,
      leadId,
      city: normalized.city || req.user.city || '',
      state: normalized.state || req.user.state || '',
      schoolCollege: normalized.schoolCollege || req.user.organization || '',
      partnerId: req.user.id,
      partnerName: req.user.name,
      partnerType: req.user.partnerType,
      status: 'new',
      statusHistory: [{
        status: 'new',
        note: `Lead submitted by partner (${normalized.leadType === 'business' ? 'B2B' : 'B2C'})`,
        updatedBy: req.user.id,
        updatedByName: req.user.name,
        createdAt: new Date().toISOString(),
      }],
    });

    db.updateUser(req.user.id, { totalLeads: (req.user.totalLeads || 0) + 1 });
    db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'lead_created', entityType: 'lead', entityId: lead.id, details: lead.studentName });

    const admins = db.getUsers().filter((u) => (u.role === 'admin' || u.role === 'super_admin') && u.status === 'active');
    await Promise.all(
      admins.map((admin) =>
        notifyUser(admin.id, {
          title: 'New lead received',
          message: `${req.user.name} submitted ${normalized.leadType === 'business' ? 'B2B' : 'B2C'} lead for ${lead.studentName}`,
          type: 'lead_update',
          link: '/admin?tab=leads',
          meta: { leadId: lead.id },
        })
      )
    );

    res.status(201).json({ lead: { ...lead, _id: lead.id }, message: 'Lead submitted successfully' });
  } catch (e) {
    res.status(e.status || 400).json({ message: e.message || 'Failed to create lead' });
  }
});

router.get('/leads/:id', activePartnerOnly, (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!lead || lead.partnerId !== req.user.id) return res.status(404).json({ message: 'Lead not found' });
  res.json({ lead: { ...lead, _id: lead.id } });
});

router.get('/commissions', activePartnerOnly, (req, res) => {
  const commissions = db.getCommissions({ partnerId: req.user.id }).map(db.populateCommission);
  res.json({ commissions });
});

router.get('/notifications', (req, res) => {
  const notifications = db.getNotifications(req.user.id).map((n) => ({ ...n, _id: n.id }));
  res.json({ notifications, unread: db.countUnreadNotifications(req.user.id) });
});

router.patch('/notifications/:id/read', (req, res) => {
  db.markNotificationRead(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.patch('/notifications/read-all', (req, res) => {
  db.markAllNotificationsRead(req.user.id);
  res.json({ ok: true });
});

router.get('/reports', activePartnerOnly, (req, res) => {
  const leads = db.getLeads({ partnerId: req.user.id });
  const converted = leads.filter((l) => l.status === 'converted').length;
  res.json({
    monthlyTrends: db.getMonthlyTrends(6),
    conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
    avgDaysToConvert: 14,
    topInterests: getTopInterests(leads),
    tier: req.user.tier || 'bronze',
  });
});

router.get('/leaderboard', activePartnerOnly, (req, res) => {
  res.json({ leaderboard: db.getLeaderboard(15), myRank: getMyRank(req.user.id) });
});

router.get('/follow-ups', activePartnerOnly, (req, res) => {
  res.json({
    overdue: db.getFollowUps({ partnerId: req.user.id, overdue: true }),
    upcoming: db.getFollowUps({ partnerId: req.user.id, upcoming: true }),
  });
});

router.get('/announcements', (req, res) => {
  res.json({ announcements: db.getAnnouncements() });
});

router.get('/export/leads', activePartnerOnly, (req, res) => {
  const csv = db.exportLeadsCSV({ partnerId: req.user.id, status: req.query.status, search: req.query.search });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=my-leads.csv');
  res.send(csv);
});

router.post('/leads/check-duplicate', activePartnerOnly, (req, res) => {
  const duplicates = db.findDuplicateLeads(req.body.phone);
  res.json({ duplicates: duplicates.map((d) => ({ leadId: d.leadId, studentName: d.studentName, status: d.status })) });
});

router.post('/leads/bulk', activePartnerOnly, (req, res) => {
  const { leads: leadsData } = req.body;
  if (!Array.isArray(leadsData) || !leadsData.length) {
    return res.status(400).json({ message: 'Provide an array of leads' });
  }
  const created = db.bulkCreateLeads(leadsData, req.user.id, req.user);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'bulk_import', entityType: 'lead', details: `${created.length} leads` });
  res.json({ created: created.length, leads: created });
});

router.get('/leads/:id/comments', activePartnerOnly, (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!lead || lead.partnerId !== req.user.id) return res.status(404).json({ message: 'Lead not found' });
  const comments = db.getLeadComments(req.params.id).filter((c) => !c.isInternal);
  res.json({ comments });
});

router.post('/leads/:id/comments', activePartnerOnly, (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!lead || lead.partnerId !== req.user.id) return res.status(404).json({ message: 'Lead not found' });
  const comment = db.addLeadComment({
    leadId: req.params.id,
    userId: req.user.id,
    userName: req.user.name,
    role: 'partner',
    message: req.body.message,
  });
  res.status(201).json({ comment });
});

router.put('/payout-details', activePartnerOnly, (req, res) => {
  const { bankAccount, ifsc, upiId, panNumber } = req.body;
  const user = db.updateUser(req.user.id, { bankAccount, ifsc, upiId, panNumber });
  res.json({ user: db.userToSafeJSON(user) });
});

router.get('/payout-requests', activePartnerOnly, (req, res) => {
  res.json({ requests: db.getPayoutRequests({ partnerId: req.user.id }) });
});

router.post('/payout-request', activePartnerOnly, (req, res) => {
  const commissions = db.getCommissions({ partnerId: req.user.id });
  const available = commissions
    .filter((c) => c.status === 'approved')
    .reduce((s, c) => s + c.amount, 0);
  const amount = Number(req.body.amount) || available;
  const settings = db.getSettings();
  if (amount < (settings.minPayoutAmount || 500)) {
    return res.status(400).json({ message: `Minimum payout is ₹${settings.minPayoutAmount || 500}` });
  }
  if (amount > available) {
    return res.status(400).json({ message: `Only ₹${available} available for payout` });
  }
  const request = db.createPayoutRequest({
    partnerId: req.user.id,
    amount,
    method: req.body.method || 'bank',
    notes: req.body.notes || '',
  });
  res.status(201).json({ request });
});

function getTopInterests(leads) {
  const counts = {};
  leads.forEach((l) => (l.interestedIn || []).forEach((i) => { counts[i] = (counts[i] || 0) + 1; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
}

function getMyRank(userId) {
  const board = db.getLeaderboard(100);
  const idx = board.findIndex((p) => p.id === userId);
  return idx === -1 ? null : idx + 1;
}

export default router;
