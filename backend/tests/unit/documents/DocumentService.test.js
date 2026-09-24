import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentService } from '#@/modules/documents/services/DocumentService.js';
import documentRepository from '#@/modules/documents/repositories/DocumentRepository.js';
import aclResolver from '#@/modules/documents/services/ACLResolver.js';
import { storageService } from '#@/platform/storage/index.js';
import mongoose from 'mongoose';
import { ValidationError, NotFoundError, ForbiddenError } from '#@/core/errors/AppError.js';

vi.mock('#@/modules/documents/repositories/DocumentRepository.js');
vi.mock('#@/modules/documents/services/ACLResolver.js');
vi.mock('#@/platform/storage/index.js', () => {
  return {
    storageService: {
      upload: vi.fn(),
      delete: vi.fn(),
      download: vi.fn()
    }
  };
});

describe('DocumentService Unit Tests', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();
  const mockOwnerId = new mongoose.Types.ObjectId();

  const validMetadata = {
    category: 'generic',
    ownerType: 'SYSTEM',
    ownerId: mockOwnerId.toString(),
    description: 'Test document',
    metadata: { key: 'value' }
  };

  const mockFile = {
    buffer: Buffer.from('test'),
    mimetype: 'text/plain',
    size: 4,
    originalname: 'test.txt'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDocument', () => {
    it('Should successfully upload to storage and create metadata', async () => {
      // Mock storage
      storageService.upload.mockResolvedValue({
        provider: 'supabase',
        bucket: 'test-bucket',
        path: 'generic/1234',
        mimeType: 'text/plain',
        size: 4
      });

      // Mock repo
      documentRepository.createScoped.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        storagePath: 'generic/1234',
        status: 'ACTIVE'
      });

      const result = await documentService.createDocument(mockFile, validMetadata, mockOrgId, mockUserId);
      
      expect(storageService.upload).toHaveBeenCalledWith(mockFile, { category: 'generic' });
      expect(documentRepository.createScoped).toHaveBeenCalled();
      expect(result.status).toBe('ACTIVE');
    });

    it('Should throw ValidationError if metadata is invalid before uploading', async () => {
      const invalidMetadata = { ...validMetadata, category: 'INVALID_CATEGORY' };

      await expect(documentService.createDocument(mockFile, invalidMetadata, mockOrgId, mockUserId))
        .rejects.toThrow(ValidationError);
      
      expect(storageService.upload).not.toHaveBeenCalled();
      expect(documentRepository.createScoped).not.toHaveBeenCalled();
    });

    it('Should ROLLBACK (delete storage object) if metadata creation fails', async () => {
      storageService.upload.mockResolvedValue({
        provider: 'supabase',
        bucket: 'test-bucket',
        path: 'generic/1234',
        mimeType: 'text/plain',
        size: 4
      });

      // Simulate database failure
      documentRepository.createScoped.mockRejectedValue(new Error('Database Connection Lost'));

      await expect(documentService.createDocument(mockFile, validMetadata, mockOrgId, mockUserId))
        .rejects.toThrow('Database Connection Lost');

      // Ensure storage upload was called
      expect(storageService.upload).toHaveBeenCalled();
      
      // Ensure rollback deletion was called
      expect(storageService.delete).toHaveBeenCalledWith('generic/1234');
    });

    it('Should NOT create metadata if storage upload fails', async () => {
      storageService.upload.mockRejectedValue(new Error('Storage Unavailable'));

      await expect(documentService.createDocument(mockFile, validMetadata, mockOrgId, mockUserId))
        .rejects.toThrow('Storage Unavailable');

      // Database should never be hit
      expect(documentRepository.createScoped).not.toHaveBeenCalled();
    });
  });

  describe('downloadDocument', () => {
    const mockPrincipal = { userId: mockUserId, organizationId: mockOrgId };

    it('Should fetch metadata, verify ACL, and then download the storage object', async () => {
      const mockDocId = new mongoose.Types.ObjectId();
      const mockDoc = {
        _id: mockDocId,
        storagePath: 'generic/1234',
        status: 'ACTIVE',
        originalFilename: 'test.txt',
        mimeType: 'text/plain'
      };
      
      documentRepository.findActiveByIdAndTenant.mockResolvedValue(mockDoc);
      aclResolver.canAccess.mockResolvedValue(true);
      storageService.download.mockResolvedValue(Buffer.from('downloaded content'));

      const result = await documentService.downloadDocument(mockDocId, mockOrgId, mockPrincipal);
      
      expect(documentRepository.findActiveByIdAndTenant).toHaveBeenCalledWith(mockDocId, mockOrgId);
      expect(aclResolver.canAccess).toHaveBeenCalledWith({
        document: mockDoc,
        principal: mockPrincipal,
        requiredLevel: 'READ'
      });
      expect(storageService.download).toHaveBeenCalledWith('generic/1234');
      expect(result.document.originalFilename).toBe('test.txt');
      expect(result.buffer.toString()).toBe('downloaded content');
    });

    it('Should throw ForbiddenError and skip storage if document is ARCHIVED', async () => {
      documentRepository.findActiveByIdAndTenant.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'ARCHIVED'
      });

      await expect(documentService.downloadDocument(new mongoose.Types.ObjectId(), mockOrgId, mockPrincipal))
        .rejects.toThrow(ForbiddenError);
      
      expect(aclResolver.canAccess).not.toHaveBeenCalled();
      expect(storageService.download).not.toHaveBeenCalled();
    });

    it('Should skip storage download if ACLResolver throws ForbiddenError', async () => {
      documentRepository.findActiveByIdAndTenant.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'ACTIVE'
      });
      aclResolver.canAccess.mockRejectedValue(new ForbiddenError('Access Denied'));

      await expect(documentService.downloadDocument(new mongoose.Types.ObjectId(), mockOrgId, mockPrincipal))
        .rejects.toThrow(ForbiddenError);
      
      expect(storageService.download).not.toHaveBeenCalled();
    });
  });

  describe('archiveDocument (Soft Delete)', () => {
    it('Should update document status to ARCHIVED without deleting from storage', async () => {
      const mockDocId = new mongoose.Types.ObjectId();
      
      documentRepository.findActiveByIdAndTenant.mockResolvedValue({
        _id: mockDocId,
        storagePath: 'generic/1234',
        status: 'ACTIVE'
      });

      documentRepository.archiveByIdAndTenant.mockResolvedValue({
        _id: mockDocId,
        storagePath: 'generic/1234',
        status: 'ARCHIVED'
      });

      const result = await documentService.archiveDocument(mockDocId, mockOrgId);
      
      expect(result.status).toBe('ARCHIVED');
      expect(storageService.delete).not.toHaveBeenCalled(); // Storage must NOT be deleted
    });

    it('Should throw NotFoundError if document does not exist', async () => {
      documentRepository.findActiveByIdAndTenant.mockResolvedValue(null);

      await expect(documentService.archiveDocument(new mongoose.Types.ObjectId(), mockOrgId))
        .rejects.toThrow(NotFoundError);
    });
  });
});
