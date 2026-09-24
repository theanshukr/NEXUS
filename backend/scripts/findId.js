import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const findId = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = Object.keys(mongoose.connection.collections);
  for (const c of collections) {
    const col = mongoose.connection.collection(c);
    const doc = await col.findOne({ _id: new mongoose.Types.ObjectId('6a4be7c27c5995a92232744d') });
    if (doc) console.log('Found in:', c);
  }
  process.exit(0);
};

findId();
