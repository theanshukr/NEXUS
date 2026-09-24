import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['MANDATORY', 'OPTIONAL'], default: 'MANDATORY' }
}, { _id: false });

const holidayCalendarSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
  year: { type: Number, required: true },
  holidays: { type: [holidaySchema], default: [] }
}, { timestamps: true });

holidayCalendarSchema.index({ organizationId: 1, locationId: 1, year: 1 }, { unique: true });

export const HolidayCalendar = mongoose.model('HolidayCalendar', holidayCalendarSchema);
export default HolidayCalendar;
