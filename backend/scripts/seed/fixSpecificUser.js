import { connectWithFallback, disconnectWithFallback } from './dbFallback.js';
import UserRoleRepository from '../../src/modules/roles/repositories/UserRoleRepository.js';
import RoleRepository from '../../src/modules/roles/repositories/RoleRepository.js';

async function fixUser() {
  await connectWithFallback();
  
  const orgId = '6a4abe694d758a79a8c2fb10'; // Hardcoded from curl response
  const userId = '6a4abe6f4d758a79a8c2fb36'; // Hardcoded from curl response
  
  const roles = await RoleRepository.findActiveRoles(orgId);
  const hrRole = roles.find(r => r.name === 'HR Manager');
  
  if (hrRole) {
    // delete existing just in case
    await UserRoleRepository.model.deleteMany({ userId, organizationId: orgId });

    await UserRoleRepository.createScoped({
      userId: userId,
      roleId: hrRole._id,
      assignedBy: userId
    }, orgId);
    console.log("Assigned HR Manager role to the specific user ID:", userId);
  } else {
    console.log("HR Manager role not found in organization", orgId);
    console.log("Roles found:", roles.map(r => r.name));
  }

  await disconnectWithFallback();
}
fixUser().catch(console.error);
