import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function startLocalServer() {
  console.log('Starting MongoDB Memory Server...');
  // Mongoose requires a replica set for ACID transactions.
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  
  console.log(`[localServer] MongoDB Memory ReplSet started at: ${uri}`);
  process.env.MONGODB_URI = uri;
  process.env.UPSTASH_REDIS_REST_URL = "http://localhost:8080";
  process.env.UPSTASH_REDIS_REST_TOKEN = "mock";

  // Import and run the seed script to populate some dev data
  try {
    const { seedDevMode } = await import('../scripts/seedDevMode.js');
    console.log('Running seed script...');
    await seedDevMode();
    console.log('Starting backend server...');
    await import('./server.js');
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

startLocalServer().catch(console.error);
