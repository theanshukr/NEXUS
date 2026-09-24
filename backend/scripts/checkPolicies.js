import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const checkPolicies = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const LeavePolicy = mongoose.model('LeavePolicy', new mongoose.Schema({}, {strict:false}), 'leavepolicies');
  const policies = await LeavePolicy.find({});
  console.log(policies.map(p => ({id: p._id, org: p.organizationId, code: p.code})));
  
  const LeaveRequest = mongoose.model('LeaveRequest', new mongoose.Schema({}, {strict:false}), 'leaverequests');
  const reqs = await LeaveRequest.find({});
  console.log('reqs:', reqs.length);

  process.exit(0);
};

checkPolicies();
