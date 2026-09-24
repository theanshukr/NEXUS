import mongoose from 'mongoose';

/**
 * EmploymentHistory Mongoose Schema — M-03
 *
 * Immutable, append-only time-series ledger of all structural employee profile changes.
 * Records are NEVER updated or deleted. Corrections are recorded as new entries.
 * All writes are exclusively managed by EmployeeService — never from Controllers.
 *
 * Supported change types:
 *   MANAGER_CHANGE     - managerId changed
 *   DEPARTMENT_CHANGE  - departmentId changed
 *   DESIGNATION_CHANGE - designationId changed
 *   LOCATION_CHANGE    - locationId changed
 *   SHIFT_CHANGE       - shiftId changed
 *   STATUS_CHANGE      - status enum changed
 *   PROMOTION          - combined designation + salary change
 *   TRANSFER           - combined department + location change
 *   RESTORE            - archivedAt metadata cleared (soft-delete reversed)
 */
const employmentHistorySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'MANAGER_CHANGE',
      'DEPARTMENT_CHANGE',
      'DESIGNATION_CHANGE',
      'LOCATION_CHANGE',
      'SHIFT_CHANGE',
      'STATUS_CHANGE',
      'PROMOTION',
      'TRANSFER',
      'RESTORE'
    ],
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // The HR user who performed the change.
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional business justification for the change.
  changeReason: {
    type: String,
    trim: true,
    default: null
  }
}, {
  // createdAt is the canonical timestamp for the history entry.
  // updatedAt is unused but included for consistency; EmployeeService enforces immutability.
  timestamps: true
});

// ---- Indexes ----
// Primary query: all history for a specific employee, ordered chronologically.
employmentHistorySchema.index({ organizationId: 1, employeeId: 1, createdAt: -1 });
// Type-filtered queries (e.g., all promotions in an org for reporting).
employmentHistorySchema.index({ organizationId: 1, type: 1, createdAt: -1 });

// Enforce ledger immutability
employmentHistorySchema.statics.preventMutation = function() {
  throw new Error('Security Violation: EmploymentHistory ledger records are strictly immutable.');
};

employmentHistorySchema.pre('findOneAndUpdate', function() { this.model.preventMutation(); });
employmentHistorySchema.pre('updateOne', function() { this.model.preventMutation(); });
employmentHistorySchema.pre('deleteOne', function() { this.model.preventMutation(); });

export const EmploymentHistory = mongoose.model('EmploymentHistory', employmentHistorySchema);
export default EmploymentHistory;
