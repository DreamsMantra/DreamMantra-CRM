import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import CrmStore from '../models/CrmStore.js';
import { connectMongo, isMongoConfigured } from './mongo.js';
import { migrateFranchiseToAgency } from './agency.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export const defaultStore = {
  users: [],
  leads: [],
  students: [],
  commissions: [],
  notifications: [],
  activities: [],
  announcements: [],
  leadComments: [],
  messages: [],
  tasks: [],
  sessions: [],
  reports: [],
  callLogs: [],
  payments: [],
  payoutRequests: [],
  automations: [],
  auditLog: [],
  teamMembers: [],
  settings: {
    companyName: 'Dream Mantra',
    supportEmail: 'info@dreammantra.in',
    supportPhone: '9680102276',
    defaultCommissionRate: 10,
    whatsappNumber: '919680102276',
    welcomeMessage: 'Welcome to Dream Mantra Partner Network!',
    minPayoutAmount: 500,
    autoApprovePartners: false,
    customForms: [],
    products: [
      { id: 'brain_mapping', label: 'Brain Mapping', price: 4999, commission: { type: 'fixed', value: 200 } },
      { id: 'skill_mapping', label: 'Skill Mapping', price: 3999, commission: { type: 'fixed', value: 100 } },
      { id: 'ai_career_launchpad', label: 'AI Career Launchpad', price: 9999, commission: { type: 'percentage', value: 10 } },
      { id: 'counselling', label: 'Counselling', price: 1999, commission: { type: 'percentage', value: 15 } },
    ],
    commissionRules: [],
    rolePermissions: {},
    customRoles: [],
    productAllocations: [],
    rates: [],
    partnerResources: [],
    defaultResources: [],
    leadStatuses: null,
    automationEnabled: true,
    slaFollowUpHours: 24,
    emailTemplates: [
      { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to Dream Mantra', body: 'Dear {{name}}, welcome to Dream Mantra partner network.' },
      { id: 'follow_up', name: 'Follow-up Reminder', subject: 'Follow-up due', body: 'Hi {{name}}, follow-up is due for lead {{leadId}}.' },
      { id: 'payment', name: 'Payment Receipt', subject: 'Payment received', body: 'Thank you {{name}}. Payment of ₹{{amount}} received.' },
    ],
    whatsappTemplates: [
      { id: 'welcome', name: 'Welcome WhatsApp', body: 'Welcome to Dream Mantra! Your partner ID is {{loginId}}.' },
      { id: 'follow_up', name: 'Follow-up', body: 'Reminder: Follow up with {{studentName}} today.' },
    ],
  },
};

let memoryStore = null;
let storageMode = 'json-file';
let mongoSaveChain = Promise.resolve();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeStore(store) {
  const normalized = { ...defaultStore, ...store };
  if (!normalized.activities) normalized.activities = [];
  if (!normalized.announcements) normalized.announcements = [];
  if (!normalized.leadComments) normalized.leadComments = [];
  if (!normalized.messages) normalized.messages = [];
  if (!normalized.students) normalized.students = [];
  if (!normalized.tasks) normalized.tasks = [];
  if (!normalized.sessions) normalized.sessions = [];
  if (!normalized.reports) normalized.reports = [];
  if (!normalized.callLogs) normalized.callLogs = [];
  if (!normalized.payments) normalized.payments = [];
  if (!normalized.payoutRequests) normalized.payoutRequests = [];
  if (!normalized.automations) normalized.automations = [];
  if (!normalized.auditLog) normalized.auditLog = [];
  if (!normalized.teamMembers) normalized.teamMembers = [];
  if (!normalized.calendarNotes) normalized.calendarNotes = [];
  if (!normalized.settings) normalized.settings = { ...defaultStore.settings };
  if (!normalized.settings.customForms) normalized.settings.customForms = [];
  if (!normalized.settings.products) normalized.settings.products = defaultStore.settings.products;
  if (!normalized.settings.commissionRules) normalized.settings.commissionRules = [];
  if (!normalized.settings.rolePermissions) normalized.settings.rolePermissions = {};
  if (!Array.isArray(normalized.settings.customRoles)) normalized.settings.customRoles = [];
  if (!Array.isArray(normalized.settings.productAllocations)) normalized.settings.productAllocations = [];
  if (!Array.isArray(normalized.settings.rates)) normalized.settings.rates = [];
  if (!Array.isArray(normalized.settings.partnerResources)) normalized.settings.partnerResources = [];
  if (!Array.isArray(normalized.settings.defaultResources)) normalized.settings.defaultResources = [];
  if (!normalized.settings.emailTemplates) normalized.settings.emailTemplates = defaultStore.settings.emailTemplates;
  if (!normalized.settings.whatsappTemplates) normalized.settings.whatsappTemplates = defaultStore.settings.whatsappTemplates;
  if (!normalized.automations.length) {
    normalized.automations = [
      { id: 'auto1', name: 'Assign counsellor on counselling booked', trigger: 'status_change', fromStatus: '*', toStatus: 'counselling_booked', action: 'notify_role', targetRole: 'counsellor', active: true },
      { id: 'auto2', name: 'Notify reports team on payment done', trigger: 'status_change', fromStatus: '*', toStatus: 'payment_done', action: 'notify_role', targetRole: 'report_management', active: true },
      { id: 'auto3', name: 'SLA alert on overdue follow-up', trigger: 'sla_overdue', hours: 24, action: 'notify_assignee', active: true },
      { id: 'auto4', name: 'Auto commission on completed', trigger: 'status_change', fromStatus: '*', toStatus: 'completed', action: 'create_commission', active: true },
    ];
  }
  migrateFranchiseToAgency(normalized);
  normalized.leads.forEach((l) => {
    if (!l.leadType) l.leadType = 'student';
  });
  return normalized;
}

function loadFromFile() {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore, null, 2));
  }
  return normalizeStore(JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')));
}

function saveToFile(store) {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

async function persistToMongo(store) {
  await CrmStore.findOneAndUpdate(
    { _id: 'main' },
    { data: store, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

function queueMongoSave(store) {
  mongoSaveChain = mongoSaveChain
    .then(() => persistToMongo(store))
    .catch((err) => {
      console.error('MongoDB save failed:', err.message);
    });
  return mongoSaveChain;
}

export function getStorageMode() {
  return storageMode;
}

export async function flushStore() {
  if (storageMode === 'mongodb' && memoryStore) {
    await persistToMongo(memoryStore);
  }
}

export async function initStore() {
  if (isMongoConfigured()) {
    await connectMongo();
    const doc = await CrmStore.findById('main').lean();
    if (doc?.data) {
      memoryStore = normalizeStore(doc.data);
      console.log('✓ CRM data loaded from MongoDB');
    } else if (fs.existsSync(STORE_FILE)) {
      memoryStore = loadFromFile();
      await persistToMongo(memoryStore);
      console.log('✓ Migrated local store.json → MongoDB');
    } else {
      memoryStore = normalizeStore(defaultStore);
      await persistToMongo(memoryStore);
      console.log('✓ Initialized new CRM database on MongoDB');
    }
    storageMode = 'mongodb';
  } else {
    memoryStore = loadFromFile();
    storageMode = 'json-file';
    console.log('✓ Using local JSON file database (set MONGODB_URI for Atlas)');
  }
}

export function loadStore() {
  if (!memoryStore) {
    throw new Error('Database not initialized — call initStore() first');
  }
  return memoryStore;
}

export function saveStore(store) {
  memoryStore = normalizeStore(store);
  if (storageMode === 'mongodb') {
    return queueMongoSave(memoryStore);
  }
  saveToFile(memoryStore);
  return Promise.resolve();
}

export async function saveStoreSync(store) {
  memoryStore = normalizeStore(store);
  if (storageMode === 'mongodb') {
    await persistToMongo(memoryStore);
  } else {
    saveToFile(memoryStore);
  }
}

export function newId() {
  return nanoid(12);
}

export function now() {
  return new Date().toISOString();
}

export function matchId(item, id) {
  return item.id === id || item._id === id;
}

export function findById(collection, id) {
  return collection.find((item) => matchId(item, id)) || null;
}

export function sortByDate(items, field = 'createdAt', desc = true) {
  return [...items].sort((a, b) => {
    const av = new Date(a[field] || 0).getTime();
    const bv = new Date(b[field] || 0).getTime();
    return desc ? bv - av : av - bv;
  });
}

export function regexMatch(value, pattern) {
  if (!pattern) return true;
  return new RegExp(pattern, 'i').test(value || '');
}
