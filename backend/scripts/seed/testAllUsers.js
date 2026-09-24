import { connectWithFallback, disconnectWithFallback } from './dbFallback.js';
import User from '../../src/modules/users/models/User.js';

async function test() {
  await connectWithFallback();
  const users = await User.find({ email: 'priya.nair@vektorflow.ai' });
  console.log("Users in DB:", users.map(u => u._id));
  await disconnectWithFallback();
}
test();
