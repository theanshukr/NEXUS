import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/platform/database/db.js';

import Employee from '../src/modules/employees/models/Employee.js';
import SalaryStructure from '../src/modules/payroll/models/SalaryStructure.js';
import PayrollCycle from '../src/modules/payroll/models/PayrollCycle.js';
import PayrollRunService from '../src/modules/payroll/services/PayrollRunService.js';
import Organization from '../src/modules/organization/models/Organization.js';
import User from '../src/modules/users/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const runPayrollTest = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to database for Payroll Test...');

    const org = await Organization.findOne({ code: 'DEV' });
    if (!org) {
      console.error('DEV Organization not found. Run seedDevMode.js first.');
      process.exit(1);
    }
    const orgId = org._id;

    const adminUser = await User.findOne({ email: 'admin@dev.com', organizationId: orgId });
    const actorId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    console.log('Fetching employees...');
    const employees = await Employee.find({ organizationId: orgId, archivedAt: null });
    console.log(`Found ${employees.length} employees.`);

    if (employees.length === 0) {
      console.log('No employees found. Please seed employees first.');
      process.exit(1);
    }

    console.log('Ensuring SalaryStructures for all employees...');
    for (const emp of employees) {
      const existing = await SalaryStructure.findOne({ organizationId: orgId, employeeId: emp._id, status: 'ACTIVE' });
      if (!existing) {
        await SalaryStructure.create({
          organizationId: orgId,
          version: 1,
          effectiveFrom: new Date('2023-01-01'),
          status: 'ACTIVE',
          employeeId: emp._id,
          currency: 'USD',
          baseSalary: Math.floor(Math.random() * 5000) + 6000, // Random base between 6k and 11k
          components: [
            { name: 'Housing Allowance', type: 'EARNING', calculationType: 'FIXED', amount: 1500 },
            { name: 'Health Insurance', type: 'DEDUCTION', calculationType: 'FIXED', amount: 250 },
            { name: '401k', type: 'DEDUCTION', calculationType: 'FIXED', amount: 400 }
          ]
        });
      }
    }

    console.log('Creating PayrollCycle...');
    const cycleIdentifier = `DEC-2023-${Date.now()}`;
    const cycleStart = '2023-12-01';
    const cycleEnd = '2023-12-31';

    const cycle = await PayrollCycle.create({
      organizationId: orgId,
      cycleIdentifier,
      cycleStart,
      cycleEnd,
      payFrequency: 'MONTHLY',
      status: 'OPEN',
      currency: 'USD',
      payDate: new Date('2023-12-31')
    });

    console.log(`Creating PayrollRun for cycle: ${cycleIdentifier}...`);
    const { run, generatedPayslipsCount } = await PayrollRunService.createRun(cycle._id, actorId, orgId);
    console.log(`Created PayrollRun (${run._id}) with ${generatedPayslipsCount} payslips.`);

    console.log('Finalizing Payslips...');
    const finalizeRes = await PayrollRunService.finalizeAllPayslips(run._id, orgId);
    console.log(`Finalized ${finalizeRes.finalizedCount} payslips.`);

    console.log('Locking PayrollRun...');
    await PayrollRunService.lockRun(run._id, actorId, orgId);
    console.log('Payroll run locked and payouts processed (simulated).');

    console.log('✅ Test payroll run complete!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error running payroll test:', err);
    process.exit(1);
  }
};

runPayrollTest();
