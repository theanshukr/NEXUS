import { connectWithFallback, disconnectWithFallback } from './dbFallback.js';
import UserRoleRepository from '../../src/modules/roles/repositories/UserRoleRepository.js';
import UserRepository from '../../src/modules/users/repositories/UserRepository.js';
import '../../src/modules/roles/models/Role.js';

async function test() {
  await connectWithFallback();
  
  const org = await (await import('../../src/modules/organization/repositories/OrganizationRepository.js')).default.findByCode('VFK');
  const user = await UserRepository.findByEmailAndTenant('priya.nair@vektorflow.ai', org._id);
  console.log("User:", user);
  
  const roles = await UserRoleRepository.findRolesByUser(user._id, user.organizationId);
  console.log("UserRolesDocs:", roles);
  console.log("Mapped:", roles.map(ur => ur.roleId?.name));
  
  await disconnectWithFallback();
}
test();
