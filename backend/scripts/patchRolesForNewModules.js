import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/platform/database/db.js';
import Role from '../src/modules/roles/models/Role.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function patch() {
  await connectDB();
  console.log('Connected to MongoDB. Patching roles for new modules...');
  
  // Administrator gets helpdesk and asset permissions
  await Role.updateMany({ name: 'Administrator' }, {
    $addToSet: { permissions: { $each: ['helpdesk.view', 'helpdesk.manage', 'assets.view', 'assets.manage', 'projects.view', 'projects.manage'] } }
  });

  // HR Manager gets performance
  await Role.updateMany({ name: 'HR Manager' }, {
    $addToSet: { permissions: { $each: ['performance.view', 'performance.manage', 'projects.view', 'projects.manage'] } }
  });

  // Finance gets expenses
  await Role.updateMany({ name: 'Finance Executive' }, {
    $addToSet: { permissions: { $each: ['expenses.view', 'expenses.manage', 'projects.view', 'projects.manage'] } }
  });

  // All non-Super Admin roles get at least projects.view (read-only access)
  await Role.updateMany(
    { permissions: { $nin: ['*', 'projects.view'] } },
    { $addToSet: { permissions: 'projects.view' } }
  );

  console.log('Successfully patched roles with new permissions!');
  process.exit(0);
}
patch();

