import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../src/modules/organization/models/Organization.js';
import Department from '../src/modules/departments/models/Department.js';
import Designation from '../src/modules/organization/models/Designation.js';
import Location from '../src/modules/organization/models/Location.js';
import Shift from '../src/modules/organization/models/Shift.js';
import Skill from '../src/modules/nexus/models/Skill.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus');
  const org = await Organization.findOne();
  
  const deps = await Department.find({ organizationId: org._id }).limit(2);
  const desigs = await Designation.find({ organizationId: org._id }).limit(2);
  const locs = await Location.find({ organizationId: org._id }).limit(2);
  const shifts = await Shift.find({ organizationId: org._id }).limit(2);
  
  console.log('Departments:', deps.map(d => ({ _id: d._id, name: d.name })));
  console.log('Designations:', desigs.map(d => ({ _id: d._id, name: d.title || d.name }))); // is it title or name?
  console.log('Locations:', locs.map(d => ({ _id: d._id, name: d.name })));
  console.log('Shifts:', shifts.map(d => ({ _id: d._id, name: d.name })));
  
  process.exit(0);
}
run();
