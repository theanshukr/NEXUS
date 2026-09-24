import documentAccessRepository from '../repositories/DocumentAccessRepository.js';
import { ForbiddenError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';

const ACCESS_LEVEL_HIERARCHY = {
  OWNER: 50,
  SHARE: 40,
  DELETE: 30,
  WRITE: 20,
  READ: 10
};

class ACLResolver {
  /**
   * Resolves whether a security principal has the required access level for a document.
   * Enforces strict Deny-by-Default and hierarchical conflict resolution policies.
   *
   * @param {Object} accessContext 
   * @param {Object} accessContext.document - The Mongoose Document object
   * @param {Object} accessContext.principal - Normalized Security Principal { userId, organizationId, roleIds, departmentIds, teamIds }
   * @param {string} accessContext.requiredLevel - E.g. 'READ', 'WRITE'
   * @returns {boolean} Returns true if allowed. Throws ForbiddenError if denied.
   */
  async canAccess({ document, principal, requiredLevel }) {
    if (!document || !principal || !requiredLevel) {
      throw new Error('ACLResolver requires document, principal, and requiredLevel in the AccessContext.');
    }

    // 1. Implicit OWNER bypass if the principal is the native owner of the document
    if (document.ownerId && document.ownerId.toString() === principal.userId.toString()) {
      return this._evaluateHierarchy('OWNER', requiredLevel);
    }

    // 2. Fetch active grants from the DB (expired already filtered by repository)
    const activeGrants = await documentAccessRepository.findActiveGrants(document._id, principal.organizationId);

    if (!activeGrants || activeGrants.length === 0) {
      throw new ForbiddenError('Access Denied: No active access grants found for this document.');
    }

    // 3. Evaluate matching grants
    let highestGrantedLevelScore = -1;
    let highestGrantedLevelString = null;

    for (const grant of activeGrants) {
      let isMatch = false;
      const grantIdStr = grant.principalId.toString();

      switch (grant.principalType) {
        case 'USER':
          if (grantIdStr === principal.userId.toString()) isMatch = true;
          break;
        case 'ROLE':
          if (principal.roleIds && principal.roleIds.some(id => id.toString() === grantIdStr)) isMatch = true;
          break;
        case 'DEPARTMENT':
          if (principal.departmentIds && principal.departmentIds.some(id => id.toString() === grantIdStr)) isMatch = true;
          break;
        case 'TEAM':
          if (principal.teamIds && principal.teamIds.some(id => id.toString() === grantIdStr)) isMatch = true;
          break;
        case 'ORGANIZATION':
          if (grantIdStr === principal.organizationId.toString()) isMatch = true;
          break;
      }

      if (isMatch) {
        const score = ACCESS_LEVEL_HIERARCHY[grant.accessLevel] || 0;
        if (score > highestGrantedLevelScore) {
          highestGrantedLevelScore = score;
          highestGrantedLevelString = grant.accessLevel;
        }
      }
    }

    // 4. Conflict Resolution & Deny-by-Default
    if (highestGrantedLevelScore === -1) {
      logger.warn({ documentId: document._id, userId: principal.userId }, 'Access Denied: Principal did not match any active grants.');
      throw new ForbiddenError('Access Denied: You do not have permission to access this document.');
    }

    // 5. Compare against required level
    return this._evaluateHierarchy(highestGrantedLevelString, requiredLevel);
  }

  /**
   * Internal helper to compare access levels hierarchically.
   * Throws ForbiddenError if the granted level is lower than the required level.
   *
   * @param {string} grantedLevel
   * @param {string} requiredLevel
   * @returns {boolean}
   */
  _evaluateHierarchy(grantedLevel, requiredLevel) {
    const grantedScore = ACCESS_LEVEL_HIERARCHY[grantedLevel] || 0;
    const requiredScore = ACCESS_LEVEL_HIERARCHY[requiredLevel] || 0;

    if (grantedScore >= requiredScore) {
      return true;
    }

    throw new ForbiddenError(`Access Denied: Requires ${requiredLevel} access, but only ${grantedLevel} was granted.`);
  }
}

export const aclResolver = new ACLResolver();
export default aclResolver;
