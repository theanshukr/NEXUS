import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/platform/database/db.js';
import LeaveBalance from '../src/modules/leave/models/LeaveBalance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const clearBalances = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to database to clear balances...');

    const LeaveBalance = mongoose.model('LeaveBalance');
    await LeaveBalance.deleteMany({});
    console.log('✅ Cleared LeaveBalances');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
};

clearBalances();
