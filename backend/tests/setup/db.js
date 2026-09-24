import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet;

/**
 * Starts a Mongo Memory Replica Set (required for ACID transactions).
 * Called once before all tests in an integration test file.
 */
export async function startDb() {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await clearDb();
}

/**
 * Drops all collections between tests to ensure clean state.
 */
export async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnects Mongoose and stops the in-memory replica set.
 * Called once after all tests in an integration test file.
 */
export async function stopDb() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}
