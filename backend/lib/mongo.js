import dns from 'dns';
import mongoose from 'mongoose';

let connected = false;

/** Windows/corporate DNS often refuses SRV lookups; Atlas mongodb+srv needs reliable resolvers. */
function configureDnsForAtlas(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return;
  const system = dns.getServers().filter(Boolean);
  const resolvers = [...new Set(['8.8.8.8', '8.8.4.4', '1.1.1.1', ...system])];
  dns.setServers(resolvers);
}

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not set in .env');

  configureDnsForAtlas(uri);
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });

  connected = true;
  const { host, name } = mongoose.connection;
  const label = host?.includes('mongodb.net') ? 'MongoDB Atlas' : 'MongoDB';
  console.log(`✓ ${label} connected (${host} / ${name})`);
  return mongoose.connection;
}

export function getMongoStatus() {
  if (!isMongoConfigured()) return 'not_configured';
  if (!connected) return 'disconnected';
  return mongoose.connection.readyState === 1 ? 'connected' : 'connecting';
}

export async function disconnectMongo() {
  if (connected) {
    await mongoose.disconnect();
    connected = false;
  }
}
