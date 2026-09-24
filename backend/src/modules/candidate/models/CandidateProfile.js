import mongoose from 'mongoose';

const candidateProfileSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    unique: true, // One profile per candidate
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  headline: { type: String, trim: true },
  summary: { type: String, trim: true },
  
  // These arrays could be broken out into separate collections if they grow too large,
  // but for horizontal scalability in early enterprise phases, embedding is often fine.
  education: [{
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    fieldOfStudy: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false }
  }],
  
  experience: [{
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String }
  }],
  
  skills: [{ type: String, trim: true }],
  languages: [{ type: String, trim: true }],
  certifications: [{
    name: { type: String, required: true },
    issuer: { type: String },
    issueDate: { type: Date },
    url: { type: String }
  }],
  
  socialLinks: {
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    portfolio: { type: String, trim: true },
    twitter: { type: String, trim: true }
  },
  
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postalCode: { type: String }
  },
  
  profilePhotoDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  }
}, { timestamps: true });

export const CandidateProfile = mongoose.model('CandidateProfile', candidateProfileSchema);
export default CandidateProfile;
