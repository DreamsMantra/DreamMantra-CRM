import { initStore, flushStore, getStorageMode } from './lib/store.js';
import { getMongoStatus, isMongoConfigured } from './lib/mongo.js';

let dbReady = false;

export function getDbStatus() {
  if (!dbReady) return 'initializing';
  if (isMongoConfigured()) return getMongoStatus();
  return 'connected';
}

export function getStorageInfo() {
  return {
    mode: getStorageMode(),
    mongo: isMongoConfigured() ? getMongoStatus() : 'not_configured',
  };
}

export async function initDatabase() {
  await initStore();
  const { seedAdmin, ensurePartnerLoginIds } = await import('./lib/db.js');
  await seedAdmin();
  ensurePartnerLoginIds();
  dbReady = true;
}

export async function shutdownDatabase() {
  await flushStore();
}
