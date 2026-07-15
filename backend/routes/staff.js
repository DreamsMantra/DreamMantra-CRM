import { Router } from 'express';
import * as db from '../lib/db.js';
import { authRequired, loadUser, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(authRequired, loadUser);
router.use(requireRoles('sales_executive', 'counsellor', 'report_management'));

function leadScopeFilter(user) {
  if (user.role === 'sales_executive') return { assignedSalesId: user.id };
  if (user.role === 'counsellor') return { assignedCounsellorId: user.id };
  return {};
}

function canAccessLead(user, lead) {
  if (!lead) return false;
  if (user.role === 'report_management') return true;
  if (user.role === 'sales_executive') {
    return lead.assignedSalesId === user.id || lead.assignedTo === user.id;
  }
  if (user.role === 'counsellor') {
    return lead.assignedCounsellorId === user.id || lead.assignedTo === user.id;
  }
  return false;
}

router.get('/dashboard', (req, res) => {
  res.json(db.getStaffDashboard(req.user));
});

router.get('/leads', (req, res) => {
  const filter = { ...req.query };
  if (req.user.role === 'sales_executive') {
    const leads = db.getLeads(filter).filter(
      (l) => l.assignedSalesId === req.user.id || l.assignedTo === req.user.id
    );
    return res.json({ leads: leads.map((l) => db.populateLead(l)) });
  }
  if (req.user.role === 'counsellor') {
    const leads = db.getLeads(filter).filter(
      (l) => l.assignedCounsellorId === req.user.id || l.assignedTo === req.user.id
    );
    return res.json({ leads: leads.map((l) => db.populateLead(l)) });
  }
  res.json({ leads: db.getLeads(filter).map((l) => db.populateLead(l)) });
});

router.get('/students', (req, res) => {
  const filter = { ...req.query };
  if (req.user.role === 'counsellor') filter.assignedCounsellorId = req.user.id;
  if (req.user.role === 'sales_executive') filter.assignedSalesId = req.user.id;
  res.json({ students: db.getStudents(filter) });
});

router.get('/tasks', (req, res) => {
  res.json({ tasks: db.getTasks({ userId: req.user.id, ...req.query }) });
});

router.post('/tasks', (req, res) => {
  const task = db.createTask({ ...req.body, assignedTo: req.body.assignedTo || req.user.id, createdBy: req.user.id });
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'task_created', entityType: 'task', entityId: task.id });
  res.status(201).json({ task });
});

router.patch('/tasks/:id', (req, res) => {
  const task = db.updateTask(req.params.id, req.body);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json({ task });
});

router.get('/sessions', (req, res) => {
  const filter = req.user.role === 'counsellor' ? { counsellorId: req.user.id } : req.query;
  res.json({ sessions: db.getSessions(filter) });
});

router.post('/sessions', (req, res) => {
  const session = db.createSession({ ...req.body, counsellorId: req.user.id, counsellorName: req.user.name });
  res.status(201).json({ session });
});

router.get('/reports', (req, res) => {
  const filter = req.user.role === 'report_management' ? { ...req.query } : { assignedTo: req.user.id };
  res.json({ reports: db.getReports(filter) });
});

router.post('/reports', (req, res) => {
  const report = db.createReport({ ...req.body, assignedTo: req.user.id, createdBy: req.user.id });
  res.status(201).json({ report });
});

router.patch('/reports/:id', (req, res) => {
  const report = db.updateReport(req.params.id, req.body);
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json({ report });
});

router.get('/calls', (req, res) => {
  res.json({ calls: db.getCallLogs({ userId: req.user.id }) });
});

router.post('/calls', (req, res) => {
  const log = db.createCallLog({ ...req.body, userId: req.user.id, userName: req.user.name });
  res.status(201).json({ call: log });
});

router.get('/follow-ups', (req, res) => {
  res.json(db.getFollowUpBuckets(leadScopeFilter(req.user)));
});

/** Sales can set per-lead/product price & commission overrides */
router.get('/product-rate-overrides', (req, res) => {
  const { entityId, scope = 'lead' } = req.query;
  if (scope === 'lead' && entityId) {
    const lead = db.findLead(entityId);
    if (!canAccessLead(req.user, lead) && req.user.role !== 'report_management') {
      return res.status(404).json({ message: 'Lead not found' });
    }
  }
  res.json({ overrides: db.getProductRateOverrides(req.query) });
});

router.post('/product-rate-overrides', (req, res) => {
  try {
    const scope = req.body.scope === 'partner' ? 'partner' : 'lead';
    if (scope === 'lead') {
      const lead = db.findLead(req.body.entityId);
      if (!canAccessLead(req.user, lead) && req.user.role !== 'report_management') {
        return res.status(404).json({ message: 'Lead not found' });
      }
    } else if (req.user.role !== 'sales_executive' && req.user.role !== 'report_management') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const override = db.upsertProductRateOverride({ ...req.body, scope }, { allowCost: false });
    res.status(201).json({ override });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Sales / counsellor partner activity + projects
router.get('/partners/:id/activities', (req, res) => {
  res.json({ activities: db.getPartnerActivities(req.params.id) });
});

router.post('/partners/:id/activities', (req, res) => {
  if (!req.body.comment?.trim()) return res.status(400).json({ message: 'comment required' });
  const activity = db.createPartnerActivity({
    partnerId: req.params.id,
    type: req.body.type || 'note',
    comment: req.body.comment,
    at: req.body.at,
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdByRole: req.user.role,
  });
  res.status(201).json({ activity });
});

router.patch('/partner-activities/:id', (req, res) => {
  const updated = db.updatePartnerActivity(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json({ activity: updated });
});

router.post('/partners/:id/projects', (req, res) => {
  if (req.user.role !== 'sales_executive' && req.user.role !== 'report_management') {
    return res.status(403).json({ message: 'Not allowed' });
  }
  if (!req.body.name?.trim()) return res.status(400).json({ message: 'name required' });
  const project = db.createAgencyProject({
    partnerId: req.params.id,
    name: req.body.name,
    description: req.body.description,
    createdBy: req.user.id,
    createdByName: req.user.name,
  });
  res.status(201).json({ project });
});

router.patch('/leads/:id', async (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!canAccessLead(req.user, lead)) {
    return res.status(404).json({ message: 'Lead not found' });
  }
  const allowed = [
    'status', 'notes', 'adminNotes', 'followUpDate', 'priority',
    'assignedSalesId', 'assignedCounsellorId', 'assignedTo',
    'studentName', 'studentPhone', 'studentEmail', 'parentName', 'parentPhone',
    'classGrade', 'stream', 'schoolCollege', 'city', 'state',
    'companyName', 'contactPerson', 'contactPhone', 'contactEmail',
    'businessType', 'estimatedStudents', 'dealValue', 'interestedIn',
    'expectedValue', 'tags',
  ];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.body.note && updates.status) {
    // status note handled via statusHistory if updateLead supports it — keep in adminNotes merge
    updates.adminNotes = [lead.adminNotes, req.body.note].filter(Boolean).join('\n');
  }
  const updated = db.updateLead(req.params.id, updates);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'lead_updated', entityType: 'lead', entityId: lead.id });
  res.json({ lead: db.populateLead(updated) });
});

export default router;
