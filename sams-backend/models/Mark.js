const mongoose = require('mongoose');

const MarkSchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true },
  studentEmail: { type: String, required: true, trim: true, lowercase: true },
  classLevel: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true, uppercase: true },
  subject: { type: String, required: true, trim: true },
  examType: {
    type: String,
    enum: ['quiz', 'test', 'exam'],
    required: true,
    default: 'quiz'
  },
  score: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, required: true, min: 1, default: 100 },
  remarks: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mark', MarkSchema);
