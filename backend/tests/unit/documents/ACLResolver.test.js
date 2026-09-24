import { describe, it, expect, vi, beforeEach } from 'vitest';
import aclResolver from '#@/modules/documents/services/ACLResolver.js';
import documentAccessRepository from '#@/modules/documents/repositories/DocumentAccessRepository.js';
import { ForbiddenError } from '#@/core/errors/AppError.js';
import mongoose from 'mongoose';

vi.mock('#@/modules/documents/repositories/DocumentAccessRepository.js');

describe('ACLResolver Unit Tests', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const mockRoleId = new mongoose.Types.ObjectId();
  const mockDeptId = new mongoose.Types.ObjectId();
  const mockTeamId = new mongoose.Types.ObjectId();
  const mockDocId = new mongoose.Types.ObjectId();

  const mockPrincipal = {
    userId: mockUserId.toString(),
    organizationId: mockOrgId.toString(),
    roleIds: [mockRoleId.toString()],
    departmentIds: [mockDeptId.toString()],
    teamIds: [mockTeamId.toString()]
  };

  const mockDocument = {
    _id: mockDocId,
    ownerId: new mongoose.Types.ObjectId() // Different from mockUserId by default
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation & Security Principal Decoupling', () => {
    it('Should require document, principal, and requiredLevel in AccessContext', async () => {
      await expect(aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal }))
        .rejects.toThrow('ACLResolver requires document, principal, and requiredLevel in the AccessContext.');
    });

    it('Should not lookup users via an external service, only evaluates the provided principal', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'ROLE', principalId: mockRoleId, accessLevel: 'READ' }
      ]);
      const result = await aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'READ' });
      expect(result).toBe(true);
      expect(documentAccessRepository.findActiveGrants).toHaveBeenCalledWith(mockDocId, mockPrincipal.organizationId);
    });
  });

  describe('Implicit OWNER Bypass', () => {
    it('Should grant access immediately if principal is the document owner', async () => {
      const ownedDoc = { ...mockDocument, ownerId: mockUserId };
      
      const result = await aclResolver.canAccess({ document: ownedDoc, principal: mockPrincipal, requiredLevel: 'DELETE' });
      expect(result).toBe(true);
      
      // Should completely bypass DB query
      expect(documentAccessRepository.findActiveGrants).not.toHaveBeenCalled();
    });
  });

  describe('Access Hierarchy & Deny-by-Default', () => {
    it('Should throw ForbiddenError if no active grants exist (Deny-by-Default)', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([]);
      await expect(aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'READ' }))
        .rejects.toThrow(ForbiddenError);
    });

    it('Should throw ForbiddenError if no matching grants exist (Deny-by-Default)', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'USER', principalId: new mongoose.Types.ObjectId(), accessLevel: 'OWNER' } // Random user
      ]);
      await expect(aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'READ' }))
        .rejects.toThrow(ForbiddenError);
    });

    it('WRITE automatically grants READ', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'USER', principalId: mockUserId, accessLevel: 'WRITE' }
      ]);
      const result = await aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'READ' });
      expect(result).toBe(true);
    });

    it('SHARE automatically grants WRITE and READ', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'DEPARTMENT', principalId: mockDeptId, accessLevel: 'SHARE' }
      ]);
      const resWrite = await aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'WRITE' });
      const resRead = await aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'READ' });
      expect(resWrite).toBe(true);
      expect(resRead).toBe(true);
    });

    it('DELETE automatically grants WRITE and READ', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'TEAM', principalId: mockTeamId, accessLevel: 'DELETE' }
      ]);
      const resWrite = await aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'WRITE' });
      const resRead = await aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'READ' });
      expect(resWrite).toBe(true);
      expect(resRead).toBe(true);
    });

    it('READ does NOT grant WRITE', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'ROLE', principalId: mockRoleId, accessLevel: 'READ' }
      ]);
      await expect(aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'WRITE' }))
        .rejects.toThrow('Access Denied: Requires WRITE access, but only READ was granted.');
    });
  });

  describe('Conflict Resolution Policy', () => {
    it('Should select the highest matching access level when multiple grants exist', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'USER', principalId: mockUserId, accessLevel: 'READ' },
        { principalType: 'ROLE', principalId: mockRoleId, accessLevel: 'WRITE' },
        { principalType: 'DEPARTMENT', principalId: mockDeptId, accessLevel: 'OWNER' }
      ]);
      
      const result = await aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'DELETE' });
      // Requires DELETE, but department grant gives OWNER (highest), so it passes
      expect(result).toBe(true);
    });

    it('Should evaluate correctly if a non-matching high grant exists alongside a matching low grant', async () => {
      documentAccessRepository.findActiveGrants.mockResolvedValue([
        { principalType: 'USER', principalId: mockUserId, accessLevel: 'READ' }, // Matches
        { principalType: 'ROLE', principalId: new mongoose.Types.ObjectId(), accessLevel: 'OWNER' } // Doesn't match
      ]);
      
      await expect(aclResolver.canAccess({ document: mockDocument, principal: mockPrincipal, requiredLevel: 'WRITE' }))
        .rejects.toThrow('Access Denied: Requires WRITE access, but only READ was granted.');
    });
  });
});
