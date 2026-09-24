import { describe, it, expect } from 'vitest';
import DocumentAccess from '#@/modules/documents/models/DocumentAccess.js';
import mongoose from 'mongoose';

describe('DocumentAccess Model', () => {
  it('Should successfully validate with correct enums', () => {
    const validAccess = new DocumentAccess({
      documentId: new mongoose.Types.ObjectId(),
      principalType: 'USER',
      principalId: new mongoose.Types.ObjectId(),
      accessLevel: 'READ',
      grantedBy: new mongoose.Types.ObjectId()
    });

    const error = validAccess.validateSync();
    expect(error).toBeUndefined();
  });

  it('Should fail validation if principalType is invalid', () => {
    const invalidAccess = new DocumentAccess({
      documentId: new mongoose.Types.ObjectId(),
      principalType: 'INVALID_TYPE',
      principalId: new mongoose.Types.ObjectId(),
      accessLevel: 'READ',
      grantedBy: new mongoose.Types.ObjectId()
    });

    const error = invalidAccess.validateSync();
    expect(error.errors.principalType).toBeDefined();
    expect(error.errors.principalType.message).toMatch(/is not a valid enum value/);
  });

  it('Should fail validation if accessLevel is invalid', () => {
    const invalidAccess = new DocumentAccess({
      documentId: new mongoose.Types.ObjectId(),
      principalType: 'USER',
      principalId: new mongoose.Types.ObjectId(),
      accessLevel: 'SUPERADMIN', // Invalid
      grantedBy: new mongoose.Types.ObjectId()
    });

    const error = invalidAccess.validateSync();
    expect(error.errors.accessLevel).toBeDefined();
    expect(error.errors.accessLevel.message).toMatch(/is not a valid enum value/);
  });
});
