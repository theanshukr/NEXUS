import { storageService } from '#@/platform/storage/index.js';
import documentRepository from '../repositories/DocumentRepository.js';
import { createDocumentMetadataSchema, updateDocumentMetadataSchema } from '../validators/documentValidator.js';
import { ValidationError, NotFoundError, ForbiddenError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';
import aclResolver from './ACLResolver.js';

class DocumentService {
  /**
   * Orchestrates uploading the file to the Storage Provider and creating the Document metadata ledger.
   * Rollback: If metadata creation fails, immediately deletes the orphaned storage object.
   *
   * @param {Object} file - Multer-like file object { buffer, mimetype, size, originalname }
   * @param {Object} metadataPayload - { category, ownerType, ownerId, description, metadata }
   * @param {string} organizationId - The tenant
   * @param {string} uploadedBy - The user ID who uploaded this
   */
  async createDocument(file, metadataPayload, organizationId, uploadedBy) {
    // 1. Validate incoming metadata payload before uploading to prevent orphaned files
    const parseResult = createDocumentMetadataSchema.safeParse(metadataPayload);
    if (!parseResult.success) {
      throw new ValidationError('Invalid document metadata', parseResult.error.errors);
    }
    const validatedData = parseResult.data;

    let uploadResult;
    try {
      // 2. Upload file bytes to StorageService
      // StorageService generates path internally, decouples from Document logic
      uploadResult = await storageService.upload(file, { category: validatedData.category });
    } catch (error) {
      logger.error({ err: error, organizationId, category: validatedData.category }, 'Storage upload failed. Aborting document creation.');
      throw error; // Re-throw to caller, do not create DB record
    }

    // 3. Extract properties
    const originalFilename = file.originalname || 'unknown';
    const extensionParts = originalFilename.split('.');
    const extension = extensionParts.length > 1 ? extensionParts.pop().toLowerCase() : '';

    const documentData = {
      storageProvider: uploadResult.provider,
      bucket: uploadResult.bucket,
      storagePath: uploadResult.path,
      filename: uploadResult.path.split('/').pop(),
      originalFilename,
      mimeType: uploadResult.mimeType,
      extension,
      size: uploadResult.size,
      checksum: null, // Depending on future platform hashing implementations
      
      category: validatedData.category,
      ownerType: validatedData.ownerType,
      ownerId: validatedData.ownerId,
      uploadedBy,
      description: validatedData.description || '',
      metadata: validatedData.metadata || {}
    };

    try {
      // 4. Create metadata ledger scoped by tenant
      const documentRecord = await documentRepository.createScoped(documentData, organizationId);
      logger.info({ documentId: documentRecord._id, organizationId, storagePath: documentData.storagePath }, 'Document created successfully');
      return documentRecord;
    } catch (dbError) {
      // 5. ROLLBACK: Delete the uploaded storage object to prevent orphaned files
      logger.error({ err: dbError, organizationId, storagePath: documentData.storagePath }, 'Database insertion failed after successful storage upload. Rolling back storage object.');
      try {
        await storageService.delete(documentData.storagePath);
        logger.info({ storagePath: documentData.storagePath }, 'Rollback successful: Storage object deleted.');
      } catch (rollbackError) {
        logger.fatal({ err: rollbackError, storagePath: documentData.storagePath }, 'Rollback FAILED: Orphaned storage object remains.');
      }
      throw dbError;
    }
  }

  async getDocument(id, organizationId) {
    const document = await documentRepository.findActiveByIdAndTenant(id, organizationId);
    if (!document) {
      throw new NotFoundError(`Document not found or has been archived/deleted.`);
    }
    return document;
  }

  /**
   * Retrieves a document's metadata and its underlying file bytes from storage.
   * This acts as the secure gateway before streaming to clients.
   * 
   * @param {string} id - The Document ID
   * @param {string} organizationId - The tenant
   * @param {Object} principal - Normalized Security Principal { userId, organizationId, roleIds, departmentIds, teamIds }
   * @returns {Promise<{ document: Object, buffer: Buffer }>}
   */
  async downloadDocument(id, organizationId, principal) {
    // 1. Load metadata
    const document = await this.getDocument(id, organizationId);

    if (document.status === 'ARCHIVED') {
      throw new ForbiddenError('Access Denied: Archived documents cannot be downloaded.');
    }

    // 2. Perform ACL Resolution before allowing any access to storage
    await aclResolver.canAccess({
      document,
      principal,
      requiredLevel: 'READ'
    });

    // 3. Download from StorageService using the internal storage path
    const buffer = await storageService.download(document.storagePath);

    return { document, buffer };
  }

  async updateDocument(id, updatePayload, organizationId) {
    const parseResult = updateDocumentMetadataSchema.safeParse(updatePayload);
    if (!parseResult.success) {
      throw new ValidationError('Invalid document update payload', parseResult.error.errors);
    }
    const validatedData = parseResult.data;

    const document = await documentRepository.findActiveByIdAndTenant(id, organizationId);
    if (!document) {
      throw new NotFoundError(`Document not found or has been archived/deleted.`);
    }

    const newVersion = document.version + 1;
    
    const updatedDocument = await documentRepository.updateByIdAndTenant(
      id,
      { ...validatedData, version: newVersion },
      organizationId
    );

    return updatedDocument;
  }

  /**
   * Soft deletes a document (Archives it).
   * Does NOT delete underlying storage object per architectural decision (cleanup handled later).
   */
  async archiveDocument(id, organizationId) {
    const document = await documentRepository.findActiveByIdAndTenant(id, organizationId);
    if (!document) {
      throw new NotFoundError(`Document not found or already archived/deleted.`);
    }

    const archivedDoc = await documentRepository.archiveByIdAndTenant(id, organizationId);
    logger.info({ documentId: id, organizationId }, 'Document archived successfully');
    
    return archivedDoc;
  }
}

export const documentService = new DocumentService();
export default documentService;
