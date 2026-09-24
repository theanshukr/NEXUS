import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI;

async function waitForConnection() {
  console.log(`Connecting to ${uri}...`);
  let attempts = 0;
  while (attempts < 20) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Successfully connected to MongoDB!');
      process.exit(0);
    } catch (error) {
      attempts++;
      console.log(`Attempt ${attempts} failed. Waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  console.error("Could not connect after 20 attempts.");
  process.exit(1);
}

waitForConnection();
