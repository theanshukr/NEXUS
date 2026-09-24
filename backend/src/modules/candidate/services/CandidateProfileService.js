import { NotFoundError } from '#@/core/errors/AppError.js';
import CandidateProfile from '../models/CandidateProfile.js';
import CandidateDocument from '../models/CandidateDocument.js';

export class CandidateProfileService {
  async getProfile(candidateId, organizationId) {
    const profile = await CandidateProfile.findOne({ candidateId, organizationId }).populate('profilePhotoDocumentId');
    if (!profile) {
      throw new NotFoundError('Candidate profile not found.');
    }

    const uploadedDocuments = await CandidateDocument.find({ candidateId, organizationId }).populate('documentId').sort({ createdAt: -1 });

    const resumes = uploadedDocuments.filter(doc => doc.type === 'RESUME');
    const defaultResume = resumes.find(doc => doc.isDefault) || resumes[0] || null;

    const resumeMetadata = {
      count: resumes.length,
      defaultResumeId: defaultResume ? defaultResume._id : null,
      latestResume: defaultResume ? {
        id: defaultResume._id,
        documentId: defaultResume.documentId?._id || defaultResume.documentId,
        filename: defaultResume.documentId?.originalFilename || defaultResume.documentId?.filename || 'resume.pdf',
        uploadedAt: defaultResume.createdAt,
        isDefault: defaultResume.isDefault
      } : null
    };

    return {
      profile,
      profilePhoto: profile.profilePhotoDocumentId || null,
      uploadedDocuments,
      resumeMetadata
    };
  }

  async updateProfile(candidateId, organizationId, payload) {
    const profile = await CandidateProfile.findOne({ candidateId, organizationId });
    if (!profile) {
      throw new NotFoundError('Candidate profile not found.');
    }

    const editableFields = [
      'firstName', 'lastName', 'phone', 'headline', 'summary',
      'education', 'experience', 'skills', 'languages',
      'certifications', 'socialLinks', 'address', 'profilePhotoDocumentId'
    ];

    for (const field of editableFields) {
      if (payload[field] !== undefined) {
        profile[field] = payload[field];
      }
    }

    await profile.save();

    return await this.getProfile(candidateId, organizationId);
  }
}

export default new CandidateProfileService();
