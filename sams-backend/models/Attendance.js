const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true },
  studentEmail: { type: String, required: true, trim: true, lowercase: true },
  classLevel: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true, uppercase: true },
  subject: { type: String, trim: true, default: '' },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    required: true,
    default: 'present',
  },
  remarks: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
