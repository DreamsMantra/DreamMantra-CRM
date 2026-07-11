let dbReady = false;

export function getDbStatus() {
  return dbReady ? 'connected' : 'disconnected';
}

export async function initDatabase() {
  const { seedAdmin, ensurePartnerLoginIds } = await import('./lib/db.js');
  await seedAdmin();
  ensurePartnerLoginIds();
  dbReady = true;
}
