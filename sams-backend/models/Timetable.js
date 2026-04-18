const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  teacherName: { type: String, required: true },
  roomNumber: { type: String, default: "Room 101" },
  classLevel: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true, uppercase: true },
  day: { type: String, required: true },
  startTime: { type: String, required: true },
  startPeriod: { type: String, enum: ['AM', 'PM'], required: true, default: 'AM' },
  endTime: { type: String, required: true },
  endPeriod: { type: String, enum: ['AM', 'PM'], required: true, default: 'AM' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', TimetableSchema);
