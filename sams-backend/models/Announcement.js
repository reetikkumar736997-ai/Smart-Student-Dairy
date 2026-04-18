const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  urgency: { type: String, enum: ['normal', 'high', 'urgent', 'event'], default: 'normal' },
  classLevel: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true, uppercase: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
