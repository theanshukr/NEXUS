import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../../src/modules/notifications/models/Notification.js';

dotenv.config({ path: '../../.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/people-flow';

const mockNotifications = [
  // Standard Employee
  { title: 'Annual Leave Approved', message: 'Your request for Dec 12 - Dec 20 has been approved by your manager.', priority: 'success', targetRoles: ['Standard Employee'], channel: 'in-app' },
  { title: 'Mandatory Training', message: 'Security Awareness training is due in 3 days. Please complete it ASAP.', priority: 'warning', targetRoles: ['Standard Employee', 'HR Manager', 'Finance Executive', 'IT Admin', 'Super Admin'], channel: 'email' },
  { title: 'Townhall Meeting', message: 'Join the Q4 All-Hands meeting tomorrow at 10:00 AM PST.', priority: 'info', targetRoles: ['Standard Employee', 'HR Manager', 'Finance Executive', 'IT Admin', 'Super Admin'], channel: 'in-app' },

  // HR Manager
  { title: 'Onboarding Action Required', message: 'Please approve the final onboarding checklist for new hire Alex Johnson.', priority: 'warning', targetRoles: ['HR Manager'], channel: 'in-app' },
  { title: 'Survey Results Ready', message: 'The Q3 Employee Satisfaction Survey results are now available for review.', priority: 'success', targetRoles: ['HR Manager'], channel: 'email' },

  // IT Admin
  { title: 'SLA Breach Warning', message: 'VPN Access request (REQ-4912) is 2 hours overdue.', priority: 'warning', targetRoles: ['IT Admin', 'Administrator'], channel: 'sms' },
  { title: 'Hardware Request', message: 'New request for MacBook Pro M3 from Engineering department.', priority: 'info', targetRoles: ['IT Admin', 'Administrator'], channel: 'in-app' },

  // Finance Executive
  { title: 'Payroll Pending Approval', message: 'Q3 Payroll Run #402 requires your final cryptographic signature.', priority: 'warning', targetRoles: ['Finance Executive', 'Finance'], channel: 'sms' },
  { title: 'Expense Anomaly', message: 'Unusual expense pattern detected in Sales department Q3 budget.', priority: 'critical', targetRoles: ['Finance Executive', 'Finance'], channel: 'email' },

  // Super Admin
  { title: 'CRITICAL: Security Alert', message: 'Multiple failed login attempts detected for root account from IP 192.168.1.42.', priority: 'critical', targetRoles: ['Super Admin'], channel: 'sms' },
  { title: 'API Rate Limit', message: 'Tenant TN-4912 has exceeded their API rate limit threshold.', priority: 'warning', targetRoles: ['Super Admin'], channel: 'in-app' }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // For seeding, let's use a dummy tenantId or try to fetch the first organization
    const db = mongoose.connection.db;
    const org = await db.collection('organizations').findOne({});
    const tenantId = org ? org.tenantId : 'tenant_001';
    console.log(`Using tenantId: ${tenantId}`);

    await Notification.deleteMany({ tenantId });
    console.log('Cleared existing notifications');

    const mapped = mockNotifications.map(n => ({
      ...n,
      tenantId
    }));

    await Notification.insertMany(mapped);
    console.log(`Successfully inserted ${mapped.length} notifications`);
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
