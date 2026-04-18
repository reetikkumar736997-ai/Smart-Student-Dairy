const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },   // original file name
  filepath: { type: String, required: true },   // path on server disk
  size: { type: String, default: "N/A" },
  course: { type: String, default: "General" },
  classLevel: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true, uppercase: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', MaterialSchema);
