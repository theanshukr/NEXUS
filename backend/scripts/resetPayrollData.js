import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/platform/database/db.js';
import PayrollRun from '../src/modules/payroll/models/PayrollRun.js';
import Payslip from '../src/modules/payroll/models/Payslip.js';
import PayrollCycle from '../src/modules/payroll/models/PayrollCycle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const resetPayroll = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to database. Resetting payroll data...');

    await PayrollRun.deleteMany({});
    console.log('✅ Cleared PayrollRuns');

    await Payslip.deleteMany({});
    console.log('✅ Cleared Payslips');

    await PayrollCycle.deleteMany({});
    console.log('✅ Cleared PayrollCycles');

    console.log('🎉 All payroll data reset successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to reset payroll data:', err);
    process.exit(1);
  }
};

resetPayroll();
