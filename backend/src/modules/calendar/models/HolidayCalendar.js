import mongoose from 'mongoose';

const holidayCalendarSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  workingWeek: {
    type: [String],
    enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    default: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
  },
  holidays: [{
    date: {
      type: Date,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

holidayCalendarSchema.index({ organizationId: 1, year: 1, locationId: 1 }, { unique: true });

holidayCalendarSchema.pre('save', async function(next) {
  if (this.isDefault) {
    const existingDefault = await mongoose.models.HolidayCalendar.findOne({
      organizationId: this.organizationId,
      year: this.year,
      isDefault: true,
      _id: { $ne: this._id }
    });
    if (existingDefault) {
      throw new Error(`A default calendar already exists for year ${this.year}`);
    }
  }
  next();
});

export default mongoose.models.HolidayCalendar || mongoose.model('HolidayCalendar', holidayCalendarSchema);
