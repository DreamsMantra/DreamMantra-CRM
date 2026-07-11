import mongoose from 'mongoose';

let connected = false;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not set in .env');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });

  connected = true;
  const { host, name } = mongoose.connection;
  console.log(`✓ MongoDB Atlas connected (${host} / ${name})`);
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
