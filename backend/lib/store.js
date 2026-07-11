import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const defaultStore = {
  users: [],
  leads: [],
  commissions: [],
  notifications: [],
  activities: [],
  announcements: [],
  leadComments: [],
  messages: [],
  settings: {
    companyName: 'Dream Mantra',
    supportEmail: 'info@dreammantra.in',
    supportPhone: '9680102276',
    defaultCommissionRate: 10,
    whatsappNumber: '919680102276',
    welcomeMessage: 'Welcome to Dream Mantra Partner Network!',
    minPayoutAmount: 500,
    autoApprovePartners: false,
  },
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore, null, 2));
  }
}

export function loadStore() {
  ensureStore();
  const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  if (!store.activities) store.activities = [];
  if (!store.announcements) store.announcements = [];
  if (!store.leadComments) store.leadComments = [];
  if (!store.messages) store.messages = [];
  if (!store.settings) store.settings = defaultStore.settings;
  if (!store.settings.customForms) store.settings.customForms = [];
  return store;
}

export function saveStore(store) {
  ensureStore();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
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
