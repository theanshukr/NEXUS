import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  skillIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  }],
  type: {
    type: String,
    enum: ['LEARNING', 'PRACTICE', 'ASSESSMENT', 'PROJECT', 'DOCUMENTATION'],
    required: true,
    default: 'LEARNING'
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED'],
    default: 'PENDING'
  },
  completedAt: {
    type: Date,
    default: null
  }
});

const ModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  skillIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  }],
  order: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'],
    default: 'PENDING'
  },
  tasks: [TaskSchema],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
});

const skillGapSnapshotSchema = new mongoose.Schema({
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  skillName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['MISSING', 'PROFICIENCY_GAP', 'MATCHED'],
    required: true
  }
}, { _id: false });

const OnboardingPlanSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  targetDesignationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    default: null
  },
  targetProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  source: {
    type: String,
    enum: ['MANUAL', 'SKILL_GAP', 'AI_GENERATED'],
    default: 'MANUAL',
    required: true
  },
  skillGapSnapshot: [skillGapSnapshotSchema],
  modules: [ModuleSchema],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Pre-save hook to derive progress
OnboardingPlanSchema.pre('save', function () {
  let totalTasks = 0;
  let completedTasks = 0;

  if (this.modules && this.modules.length > 0) {
    this.modules.forEach(module => {
      let moduleTotal = 0;
      let moduleCompleted = 0;

      if (module.tasks && module.tasks.length > 0) {
        module.tasks.forEach(task => {
          totalTasks++;
          moduleTotal++;
          if (task.status === 'COMPLETED') {
            completedTasks++;
            moduleCompleted++;
          }
        });
      }

      if (moduleTotal > 0) {
        module.progress = Math.round((moduleCompleted / moduleTotal) * 100);
        if (module.progress === 100 && module.status !== 'COMPLETED') {
          module.status = 'COMPLETED';
        } else if (module.progress > 0 && module.progress < 100 && module.status === 'PENDING') {
          module.status = 'IN_PROGRESS';
        }
      } else {
        module.progress = 0;
      }
    });

    if (totalTasks > 0) {
      this.progress = Math.round((completedTasks / totalTasks) * 100);
    } else {
      this.progress = 0;
    }
  } else {
    this.progress = 0;
  }

  // Update plan status if all completed
  if (this.progress === 100 && this.status === 'ACTIVE') {
    this.status = 'COMPLETED';
    if (!this.completedAt) this.completedAt = new Date();
  } else if (this.progress > 0 && this.progress < 100 && this.status === 'DRAFT') {
     // Usually shouldn't automatically switch from draft, but maybe handled in service.
  }
});

export const OnboardingPlan = mongoose.model('OnboardingPlan', OnboardingPlanSchema);
export default OnboardingPlan;
