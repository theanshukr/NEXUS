import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/modules/users/models/User.js';
import Role from '../src/modules/roles/models/Role.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne({ email: 'hr@dev.com' }).populate('roleId');
  if (!user) {
    console.log('hr@dev.com not found');
    process.exit(1);
  }
  
  console.log(`HR Permissions:`);
  console.log(user.roleId.permissions);
  
  process.exit(0);
}

run().catch(console.error);
