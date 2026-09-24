import connectDB from '#@/platform/database/db.js';
import User from '#@/modules/users/models/User.js';
import { connectWithFallback, disconnectWithFallback } from './dbFallback.js';
import { comparePassword } from '#@/core/utils/crypto.js';

(async () => {
  await connectWithFallback();
  const user = await User.findOne({ email: 'rajesh.sharma@vektorflow.ai' });
  console.log("User:", user?.email);
  if (user) {
    const isMatch = await comparePassword('Admin@1234', user.passwordHash);
    console.log("Password matches Admin@1234:", isMatch);
  }
  await disconnectWithFallback();
  process.exit(0);
})();
