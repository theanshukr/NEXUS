import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/platform/database/db.js';
import LeavePolicyService from '../src/modules/leave/services/LeavePolicyService.js';
import Organization from '../src/modules/organization/models/Organization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedLeavePolicies = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to database for Leave Policy Seeding...');

    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne({ code: 'DEV' });
    
    if (!org) {
      console.log('No DEV org found. Please run seedDevMode.js first.');
      process.exit(1);
    }

    const policies = [
      {
        name: 'Casual Leave',
        code: 'Casual Leave',
        type: 'PAID',
        annualAllowance: 10,
        accrualFrequency: 'NONE',
        accrualRate: 10,
        maxCarryForward: 0,
        escalationRules: {
          requireHrApproval: false,
          managerApprovalLimit: 3,
          requireDocuments: false,
          minConsecutiveDaysForDoc: 3
        }
      },
      {
        name: 'Sick Leave',
        code: 'Sick Leave',
        type: 'PAID',
        annualAllowance: 12,
        accrualFrequency: 'MONTHLY',
        accrualRate: 1,
        maxCarryForward: 6,
        escalationRules: {
          requireHrApproval: false,
          managerApprovalLimit: 5,
          requireDocuments: true,
          minConsecutiveDaysForDoc: 3
        }
      },
      {
        name: 'Earned Leave',
        code: 'Earned Leave',
        type: 'PAID',
        annualAllowance: 15,
        accrualFrequency: 'NONE',
        accrualRate: 15,
        maxCarryForward: 10,
        escalationRules: {
          requireHrApproval: true,
          managerApprovalLimit: 5,
          requireDocuments: false,
          minConsecutiveDaysForDoc: 5
        }
      }
    ];

    for (const policy of policies) {
      try {
        await LeavePolicyService.createInitialPolicy(org._id, policy, org.adminEmail || 'admin@dev.com');
        console.log(`✅ Created Leave Policy: ${policy.name}`);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(`⚠️ Policy ${policy.name} already exists.`);
        } else {
          console.error(`❌ Failed to create policy ${policy.name}:`, err.message);
        }
      }
    }

    console.log('✅ Leave Policy Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
};

seedLeavePolicies();
