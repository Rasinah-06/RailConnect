import mongoose from 'mongoose';
import { env } from './env.js';
import { Station } from '../models/Station.js';

async function startMemoryDb() {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = await import('mongodb-memory-server'));
  } catch {
    throw new Error('mongodb-memory-server is not installed. Run: npm install --prefix server');
  }
  console.log('[db] starting a temporary in-memory MongoDB (first run downloads the MongoDB binary, ~100MB)...');
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('railconnect'));
  console.log('[db] in-memory database ready. Data is lost when the server stops.');
}

export async function connectDB() {
  mongoose.set('strictQuery', true);
  if (env.useMemoryDb) {
    await startMemoryDb();
  } else {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 4000 });
      console.log(`[db] connected to MongoDB at ${env.mongoUri}`);
    } catch (e) {
      console.warn(`[db] Could not reach MongoDB at ${env.mongoUri} (${e.message.split('\n')[0]})`);
      console.warn('[db] Falling back to a temporary in-memory database. To keep data, install MongoDB or set MONGO_URI to a MongoDB Atlas URL.');
      try {
        await startMemoryDb();
      } catch (e2) {
        throw new Error(`No database available. Start MongoDB (or set MONGO_URI to an Atlas connection string). Details: ${e2.message}`);
      }
    }
  }

  // First run: load sample stations, trains and demo users automatically.
  if ((await Station.estimatedDocumentCount()) === 0) {
    const { runSeed } = await import('../seed/seed.js');
    await runSeed();
  }
}
