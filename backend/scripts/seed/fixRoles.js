import { connectWithFallback, disconnectWithFallback } from './dbFallback.js';
import OrganizationRepository from '../../src/modules/organization/repositories/OrganizationRepository.js';
import UserRepository from '../../src/modules/users/repositories/UserRepository.js';
import RoleRepository from '../../src/modules/roles/repositories/RoleRepository.js';
import UserRoleRepository from '../../src/modules/roles/repositories/UserRoleRepository.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mapRole(jobTitle) {
  if (!jobTitle) return 'Standard Employee';
  const title = jobTitle.toLowerCase();
  if (title.includes('people') || title.includes('talent') || title.includes('hr')) return 'HR Manager';
  if (title.includes('finance') || title.includes('compliance')) return 'Finance Executive';
  if (title.includes('it admin') || title.includes('it support') || title.includes('systems')) return 'Administrator';
  if (title.includes('vp') || title.includes('director')) return 'Department Manager';
  if (title.includes('chief') || title.includes('ceo')) return 'Super Admin';
  return 'Standard Employee';
}

async function fixRoles() {
  await connectWithFallback();
  
  const org = await OrganizationRepository.findByCode('VFK');
  if (!org) {
    console.error('VektorFlow org not found');
    return;
  }
  const orgId = org._id;

  const roles = await RoleRepository.findActiveRoles(orgId);
  const roleMap = {};
  for (const r of roles) {
    roleMap[r.name] = r._id;
  }

  const dataPath = path.resolve(__dirname, '../../../frontend/src/data/vektorflow_data.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const vData = JSON.parse(rawData);

  const admin = await UserRepository.findByEmailAndTenant('rajesh.sharma@vektorflow.ai', orgId);
  const adminId = admin ? admin._id : user._id; // Fallback to self if admin not found

  let updated = 0;
  for (const emp of vData.employees) {
    const { email, role: jobTitle } = emp.personalDetails;
    
    const user = await UserRepository.findByEmailAndTenant(email, orgId);
    if (!user) continue;

    // Check if user already has a role
    const existingRoles = await UserRoleRepository.findRolesByUser(user._id, orgId);
    if (existingRoles.length > 0) {
        continue;
    }

    const mappedRoleName = mapRole(jobTitle);
    const roleId = roleMap[mappedRoleName];
    
    if (roleId) {
      await UserRoleRepository.createScoped({
        userId: user._id,
        roleId: roleId,
        assignedBy: adminId // Admin assigns it
      }, orgId);
      console.log(`Assigned role ${mappedRoleName} to ${email}`);
      updated++;
    }
  }

  console.log(`Finished fixing roles. Assigned roles to ${updated} users.`);
  await disconnectWithFallback();
}

fixRoles().catch(err => {
  console.error(err);
  process.exit(1);
});
