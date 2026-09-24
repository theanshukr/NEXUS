import connectDB from '#@/platform/database/db.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

/**
 * Recursively formats department tree nodes into a clean ASCII/Unicode hierarchy string.
 * Supports detailed mode displaying Manager names and employee counts.
 *
 * @param {Array} nodes - Array of hierarchical department nodes
 * @param {string} [prefix=''] - Current line prefix for indentation and branching
 * @param {boolean} [isRoot=true] - Whether the current node level is the root level
 * @param {Object} [options={}] - Formatting options (e.g., { detailed: true, userMap: {} })
 * @returns {string} Formatted ASCII/Unicode tree string
 */
export function formatTree(nodes, prefix = '', isRoot = true, options = {}) {
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return `${prefix}(No departments found)\n`;
  }

  const { detailed = false, userMap = {} } = options;

  let output = '';
  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const branch = isRoot ? '' : (isLast ? '└── ' : '├── ');
    const empCount = node.activeEmployeeCount !== undefined ? node.activeEmployeeCount : (node.cachedEmployeeCount || 0);
    
    let managerInfo = '';
    if (detailed) {
      const managerId = node.managerUserId ? node.managerUserId.toString() : null;
      const managerName = managerId && userMap[managerId] ? userMap[managerId] : 'Unassigned';
      managerInfo = ` [Manager: ${managerName}]`;
    }

    output += `${prefix}${branch}${node.name} (${node.code}) [L${node.level}] - ${empCount} employees${managerInfo}\n`;

    if (node.children && node.children.length > 0) {
      const childPrefix = isRoot ? prefix + '  ' : prefix + (isLast ? '    ' : '│   ');
      output += formatTree(node.children, childPrefix, false, options);
    }
  });
  return output;
}

/**
 * Fetches department hierarchy from DepartmentService and prints the visual tree to the console.
 *
 * @param {string|mongoose.Types.ObjectId} [organizationId] - Organization ID or Code to query
 * @param {Object} [options={ detailed: false }] - Print options
 * @returns {Promise<string>} Formatted tree string
 */
export async function printDepartmentTree(organizationId, options = {}) {
  let targetOrgId = organizationId;

  // Resolve organization ID if string code or missing
  if (!targetOrgId || (typeof targetOrgId === 'string' && !mongoose.isValidObjectId(targetOrgId))) {
    const searchCode = targetOrgId || 'NEXUS_ENT';
    let defaultOrg = await OrganizationRepository.findByCode(searchCode);
    if (!defaultOrg && !targetOrgId) {
      defaultOrg = await OrganizationRepository.findByCode('NEXUS_DEMO');
    }
    if (!defaultOrg && !targetOrgId) {
      const allOrgs = await OrganizationRepository.findAll();
      defaultOrg = allOrgs && allOrgs.length > 0 ? allOrgs[0] : null;
    }
    if (!defaultOrg) {
      const msg = `No organization found matching '${searchCode}'. Cannot print department tree.`;
      logger.error(msg);
      console.log(`\n[ERROR] ${msg}\n`);
      return msg;
    }
    targetOrgId = defaultOrg._id;
    logger.info({ organizationId: targetOrgId, name: defaultOrg.name }, 'Resolved target organization for tree print');
  }

  logger.info({ organizationId: targetOrgId }, 'Fetching department hierarchy tree');
  const tree = await DepartmentService.getDepartmentTree(targetOrgId, { fresh: true });

  const userMap = {};
  if (options.detailed) {
    const users = await UserRepository.find({}, targetOrgId);
    for (const u of users) {
      userMap[u._id.toString()] = `${u.firstName} ${u.lastName}`;
    }
  }

  const formattedTree = formatTree(tree, '', true, { ...options, userMap });

  console.log('\n================================================================================');
  console.log('                 NEXUSOPS DEPARTMENT HIERARCHY TREE                             ');
  console.log('================================================================================\n');
  console.log(formattedTree);
  console.log('================================================================================\n');

  return formattedTree;
}

// Support CLI standalone execution
if (process.argv[1] && process.argv[1].endsWith('printDepartmentTree.js')) {
  (async () => {
    let replSet;
    try {
      try {
        await connectDB();
      } catch (err) {
        logger.warn('MongoDB Atlas connection failed. Launching local MongoMemoryReplSet...');
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        await mongoose.connect(replSet.getUri(), { serverSelectionTimeoutMS: 10000 });
      }
      const args = process.argv.slice(2);
      const detailed = args.includes('--detailed');
      const orgIdArg = args.find(a => !a.startsWith('--'));

      const allOrgs = await OrganizationRepository.findAll();
      if (!allOrgs || allOrgs.length === 0) {
        logger.info('Database empty in standalone mode. Auto-seeding NexusOps Enterprise hierarchy for visualization...');
        const { seedDemoOrganization } = await import('../seed/seedDemoOrganization.js');
        const { seedDepartments } = await import('../seed/seedDepartments.js');
        const { seedRoles } = await import('../seed/seedRoles.js');
        const { seedUsers } = await import('../seed/seedUsers.js');
        const org = await seedDemoOrganization();
        const depts = await seedDepartments(org);
        const roles = await seedRoles(org);
        await seedUsers(org, depts, roles);
      }

      await printDepartmentTree(orgIdArg || 'NEXUS_ENT', { detailed });
      await mongoose.connection.close();
      if (replSet) await replSet.stop();
      process.exit(0);
    } catch (error) {
      logger.error({ err: error.message, stack: error.stack }, 'Error printing department tree from CLI');
      console.error('Fatal error:', error.message);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      if (replSet) await replSet.stop();
      process.exit(1);
    }
  })();
}

export default printDepartmentTree;
