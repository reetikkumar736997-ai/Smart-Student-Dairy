const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { SUBJECTS_BY_CLASS } = require('../config/subjects');
const profileUpload = require('../middleware/profileUpload');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a user
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, role, classLevel, section, rollNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    if (role === 'student' && (!classLevel || !section || !rollNumber)) {
      return res.status(400).json({ error: 'Class, section, and roll number are required for students' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    if (username) {
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    user = new User({
      name,
      username: username ? username.toLowerCase() : '',
      email: email.toLowerCase(),
      password,
      role,
      classLevel: role === 'student' ? String(classLevel) : '',
      section: role === 'student' ? String(section).toUpperCase() : '',
      rollNumber: role === 'student' ? String(rollNumber) : ''
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Create JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            classLevel: user.classLevel,
            section: user.section,
            rollNumber: user.rollNumber,
            profilePicture: user.profilePicture
          }
        });
      }
    );
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    const identifier = email.toLowerCase().trim();
    let user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }
    
    if (user.role !== role) {
       return res.status(400).json({ error: 'Invalid Role for this user' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        // Also send redirect URL based on role
        let redirectUrl = '/student/dashboard';
        if (user.role === 'teacher') redirectUrl = '/teacher/dashboard';
        
        res.json({ 
          success: true, 
          token, 
          redirectUrl,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            classLevel: user.classLevel,
            section: user.section,
            rollNumber: user.rollNumber,
            profilePicture: user.profilePicture
          }
        });
      }
    );
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/auth/me
// @desc    Get logged in user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/profile/photo', auth, profileUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.profilePicture) {
      const oldPath = path.join(__dirname, '../uploads', user.profilePicture);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profilePicture = req.file.filename;
    await user.save();

    res.json({
      message: 'Profile picture updated',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        classLevel: user.classLevel,
        section: user.section,
        rollNumber: user.rollNumber,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/profile/photo', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.profilePicture) {
      const filePath = path.join(__dirname, '../uploads', user.profilePicture);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    user.profilePicture = '';
    await user.save();

    res.json({
      message: 'Profile picture removed',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        classLevel: user.classLevel,
        section: user.section,
        rollNumber: user.rollNumber,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subjects', (req, res) => {
  res.json(SUBJECTS_BY_CLASS);
});

module.exports = router;
