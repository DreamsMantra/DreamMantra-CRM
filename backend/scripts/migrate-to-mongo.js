/**
 * One-time migration: copy backend/data/store.json → MongoDB Atlas
 * Usage: set MONGODB_URI in backend/.env then run:
 *   npm run migrate:mongo
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initStore, flushStore, loadStore, getStorageMode } from '../lib/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  if (!process.env.MONGODB_URI?.trim()) {
    console.error('❌ Set MONGODB_URI in backend/.env first');
    process.exit(1);
  }

  await initStore();
  const store = loadStore();

  console.log(`Storage mode: ${getStorageMode()}`);
  console.log(`Users: ${store.users.length}`);
  console.log(`Leads: ${store.leads.length}`);
  console.log(`Messages: ${store.messages?.length || 0}`);

  await flushStore();
  console.log('✓ Migration complete — data saved to MongoDB Atlas');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
