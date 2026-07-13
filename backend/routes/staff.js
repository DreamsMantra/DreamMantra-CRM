import { Router } from 'express';
import * as db from '../lib/db.js';
import { authRequired, loadUser, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(authRequired, loadUser);
router.use(requireRoles('sales_executive', 'counsellor', 'report_management'));

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

router.get('/follow-ups', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const all = db.getFollowUps();
  res.json({
    overdue: all.filter((l) => l.followUpDate < today),
    upcoming: all.filter((l) => l.followUpDate >= today),
    today: all.filter((l) => l.followUpDate === today),
  });
});

router.patch('/leads/:id', async (req, res) => {
  const lead = db.findLead(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  const allowed = ['status', 'notes', 'adminNotes', 'followUpDate', 'priority', 'assignedSalesId', 'assignedCounsellorId'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const updated = db.updateLead(req.params.id, updates);
  db.logActivity({ userId: req.user.id, userName: req.user.name, action: 'lead_updated', entityType: 'lead', entityId: lead.id });
  res.json({ lead: db.populateLead(updated) });
});

export default router;
