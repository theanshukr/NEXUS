import mongoose from 'mongoose';

/**
 * Employee Mongoose Schema — M-03
 *
 * Represents the HR workforce profile for an organization member.
 * Strictly decoupled from authentication identity (User model in M-01).
 *
 * Soft-delete is implemented via archivedAt/archivedBy/archiveReason metadata,
 * NOT as a status enum value, matching the M-02 archiving pattern exactly.
 *
 * Optimistic concurrency is handled automatically via Mongoose's __v field.
 */
const employeeSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Loose reference to authentication identity (M-01 User).
  // Optional: employees may exist without a system account.
  // IMPORTANT: Do NOT default to null. The sparse unique index only skips documents
  // where the field is absent (undefined). Storing null causes duplicate key errors
  // when multiple employees have no linked User account.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // HR identifier. Unique per organization. May be auto-generated or manual
  // depending on OrganizationSettings.employee.codeStrategy.
  employeeCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  // ---- Editable Profile Fields (accessible via PATCH /profile) ----
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  // Must always equal User.email if a User is linked. Enforced in EmployeeService.
  workEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  // Schemaless extension point for future custom fields.
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // ---- Structural Fields (accessible via dedicated workflow PUT endpoints only) ----
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  designationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  // Self-referential: the employee's direct manager. May be null for top-level employees.
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },

  joiningDate: {
    type: Date,
    required: true
  },

  // ---- Business Lifecycle Status ----
  // ONBOARDING: Profile created, not yet invited.
  // INVITED:    Invitation issued to M-01, awaiting first login.
  // ACTIVE:     Fully onboarded and operational.
  // SUSPENDED:  Temporarily blocked. M-01 session revoked via EMPLOYEE.STATUS_CHANGED event.
  // TERMINATED: Involuntary offboarding.
  // RESIGNED:   Voluntary offboarding.
  status: {
    type: String,
    enum: ['ONBOARDING', 'INVITED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED'],
    default: 'ONBOARDING'
  },

  // ---- Soft-Delete Metadata (M-02-consistent pattern) ----
  // Archiving is NOT a business status. It is a data-retention soft-delete.
  // Repository queries exclude archived records by default ({ archivedAt: null }).
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  archiveReason: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// ---- Indexes ----
// Uniqueness: employeeCode and workEmail are unique per organization (sparse for nullable email).
employeeSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ organizationId: 1, workEmail: 1 }, { unique: true, sparse: true });
// userId is globally unique (1 user ↔ 1 employee). Sparse since not all employees have accounts.
employeeSchema.index({ userId: 1 }, { unique: true, sparse: true });
// Soft-delete filter: queries default to { archivedAt: null }.
employeeSchema.index({ organizationId: 1, archivedAt: 1 });
// Status filtering for active workforce queries.
employeeSchema.index({ organizationId: 1, status: 1, archivedAt: 1 });
// Manager hierarchy traversal.
employeeSchema.index({ organizationId: 1, managerId: 1, archivedAt: 1 });
// Department membership queries (used by M-04 Attendance, M-05 Leave).
employeeSchema.index({ organizationId: 1, departmentId: 1, archivedAt: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
