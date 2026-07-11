/**
 * Automated MongoDB Atlas setup for Dream Mantra CRM.
 * Uses Atlas Admin API — works with Cluster0 in your existing Atlas project.
 *
 * Usage (PowerShell):
 *   $env:ATLAS_PUBLIC_KEY = "your-public-key"
 *   $env:ATLAS_PRIVATE_KEY = "your-private-key"
 *   cd backend && npm run setup:atlas
 *
 * Optional: ATLAS_PROJECT_ID, ATLAS_CLUSTER_NAME, ATLAS_DB_USER, ATLAS_DB_NAME
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DigestFetch from 'digest-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ATLAS = 'https://cloud.mongodb.com/api/atlas/v2';
const API_VERSION = '2024-10-23';

const PROJECT_ID = process.env.ATLAS_PROJECT_ID?.trim() || '6a3bce1d6c06439bb11364f4';
const CLUSTER_NAME = process.env.ATLAS_CLUSTER_NAME?.trim() || 'Cluster0';
const DB_NAME = process.env.ATLAS_DB_NAME?.trim() || 'dreammantra_crm';
const DB_USER = process.env.ATLAS_DB_USER?.trim() || 'dreammantra_crm';

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`\nMissing ${name}.`);
    console.error('Atlas → Organization → Access Manager → API Keys → Create API Key\n');
    process.exit(1);
  }
  return v;
}

function atlasClient(publicKey, privateKey) {
  return new DigestFetch(publicKey, privateKey);
}

async function atlasJson(client, method, pathSuffix, body) {
  const url = `${ATLAS}${pathSuffix}`;
  const headers = {
    Accept: `application/vnd.atlas.${API_VERSION}+json`,
    ...(body ? { 'Content-Type': `application/vnd.atlas.${API_VERSION}+json` } : {}),
  };
  const res = await client.fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`${res.status} ${method} ${pathSuffix}: ${JSON.stringify(data)}`);
  return data;
}

function generatePassword() {
  return crypto.randomBytes(18).toString('base64url');
}

function buildUri(user, pass, host) {
  return `mongodb+srv://${user}:${encodeURIComponent(pass)}@${host}/${DB_NAME}?retryWrites=true&w=majority`;
}

async function waitForCluster(client, groupId) {
  for (let i = 0; i < 60; i++) {
    const c = await atlasJson(client, 'GET', `/groups/${groupId}/clusters/${CLUSTER_NAME}`);
    const state = c.stateName || c.state;
    process.stdout.write(`\r  Cluster state: ${state}   `);
    if (state === 'IDLE') {
      console.log('\n  Cluster ready.');
      return c;
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error('Cluster did not become IDLE in time.');
}

async function ensureNetworkAccess(client, groupId) {
  const entries = await atlasJson(client, 'GET', `/groups/${groupId}/accessList`);
  const list = entries.results || entries;
  if (list.some((e) => e.cidrBlock === '0.0.0.0/0')) {
    console.log('Network access: 0.0.0.0/0 already allowed');
    return;
  }
  await atlasJson(client, 'POST', `/groups/${groupId}/accessList`, [
    { cidrBlock: '0.0.0.0/0', comment: 'Dream Mantra CRM dev' },
  ]);
  console.log('Network access: allowed 0.0.0.0/0');
}

async function ensureDbUser(client, groupId, password) {
  const users = await atlasJson(client, 'GET', `/groups/${groupId}/databaseUsers`);
  const list = users.results || users;
  const pathSuffix = `/groups/${groupId}/databaseUsers/admin/${DB_USER}`;
  if (list.some((u) => u.username === DB_USER)) {
    await atlasJson(client, 'PATCH', pathSuffix, { password });
    console.log(`Database user updated: ${DB_USER}`);
    return;
  }
  await atlasJson(client, 'POST', `/groups/${groupId}/databaseUsers`, {
    databaseName: 'admin',
    username: DB_USER,
    password,
    roles: [{ roleName: 'readWriteAnyDatabase', databaseName: 'admin' }],
  });
  console.log(`Database user created: ${DB_USER}`);
}

function saveEnv(uri) {
  const envPath = path.join(ROOT, '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (/^MONGODB_URI=/m.test(content)) {
    content = content.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${uri}`);
  } else {
    content = `${content.trim()}\nMONGODB_URI=${uri}\n`;
  }
  fs.writeFileSync(envPath, content);
  console.log('✓ Saved MONGODB_URI to backend/.env');
}

async function main() {
  const publicKey = requireEnv('ATLAS_PUBLIC_KEY');
  const privateKey = requireEnv('ATLAS_PRIVATE_KEY');
  const password = process.env.ATLAS_DB_PASSWORD?.trim() || generatePassword();
  const client = atlasClient(publicKey, privateKey);

  console.log('\nDream Mantra CRM → MongoDB Atlas setup\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Cluster: ${CLUSTER_NAME}`);
  console.log(`Database: ${DB_NAME}\n`);

  const project = await atlasJson(client, 'GET', `/groups/${PROJECT_ID}`);
  console.log(`Atlas project: ${project.name}`);

  await waitForCluster(client, PROJECT_ID);
  await ensureNetworkAccess(client, PROJECT_ID);
  await ensureDbUser(client, PROJECT_ID, password);

  const cluster = await atlasJson(client, 'GET', `/groups/${PROJECT_ID}/clusters/${CLUSTER_NAME}`);
  const srv = cluster.connectionStrings?.standardSrv || '';
  const host = srv.replace('mongodb+srv://', '').replace(/\/$/, '').split('/')[0];
  if (!host) throw new Error('Could not read cluster SRV host — is Cluster0 active?');

  const uri = buildUri(DB_USER, password, host);
  saveEnv(uri);

  console.log('\n✓ Atlas setup complete');
  console.log(`  Database password (save this): ${password}`);
  console.log('\nNext: npm run migrate:mongo && npm run dev\n');
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});
