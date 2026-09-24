import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/modules/users/models/User.js';
import RbacService from '../src/modules/roles/services/RbacService.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne({ email: 'hr@dev.com' });
  const perms = await RbacService.getEffectivePermissions(user._id, user.organizationId);
  console.log('Effective permissions for hr@dev.com:');
  console.log(Array.from(perms));
  process.exit(0);
}

run().catch(console.error);
