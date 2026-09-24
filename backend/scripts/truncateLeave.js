import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/modules/users/models/User.js';
import LeaveRequest from '../src/modules/leave/models/LeaveRequest.js';
import LeaveBalance from '../src/modules/leave/models/LeaveBalance.js';
import LeaveBalanceLedger from '../src/modules/leave/models/LeaveBalanceLedger.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const user = await User.findOne({ email: 'employee@dev.com' });
  if (!user) {
    console.log('employee@dev.com not found');
    process.exit(1);
  }
  
  console.log(`Found employee: ${user._id}`);
  
  const delReqs = await LeaveRequest.deleteMany({ employeeId: user._id });
  console.log(`Deleted ${delReqs.deletedCount} leave requests.`);
  
  const delLedger = await LeaveBalanceLedger.deleteMany({ employeeId: user._id });
  console.log(`Deleted ${delLedger.deletedCount} ledger entries.`);
  
  // Reset used/pending balances to 0
  const balances = await LeaveBalance.find({ employeeId: user._id });
  for (const b of balances) {
    for (const sub of b.balances) {
      sub.used = 0;
      sub.pending = 0;
    }
    await b.save();
  }
  console.log('Reset balances to 0.');
  
  process.exit(0);
}

run().catch(console.error);
