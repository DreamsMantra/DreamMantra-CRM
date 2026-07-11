import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import CrmStore from '../models/CrmStore.js';
import { connectMongo, isMongoConfigured } from './mongo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export const defaultStore = {
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
    customForms: [],
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
  if (!normalized.settings) normalized.settings = { ...defaultStore.settings };
  if (!normalized.settings.customForms) normalized.settings.customForms = [];
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
      console.log('✓ CRM data loaded from MongoDB Atlas');
    } else if (fs.existsSync(STORE_FILE)) {
      memoryStore = loadFromFile();
      await persistToMongo(memoryStore);
      console.log('✓ Migrated local store.json → MongoDB Atlas');
    } else {
      memoryStore = normalizeStore(defaultStore);
      await persistToMongo(memoryStore);
      console.log('✓ Initialized new CRM database on MongoDB Atlas');
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
    queueMongoSave(memoryStore);
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
