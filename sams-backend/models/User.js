const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    required: true,
    default: 'student'
  },
  classLevel: {
    type: String,
    trim: true,
    default: ''
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  rollNumber: {
    type: String,
    trim: true,
    default: ''
  },
  profilePicture: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
