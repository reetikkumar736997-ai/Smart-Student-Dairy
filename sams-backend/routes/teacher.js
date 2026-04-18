const express = require('express');
const path = require('path');
const auth = require('../middleware/authMiddleware');
const requireTeacher = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');
const Timetable = require('../models/Timetable');
const Announcement = require('../models/Announcement');
const Material = require('../models/Material');
const Mark = require('../models/Mark');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { SUBJECTS_BY_CLASS } = require('../config/subjects');
const { sendNotificationEmail } = require('../utils/notificationMailer');

const router = express.Router();

router.use(auth);
router.use(requireTeacher);

function getDateRange(dateValue) {
  const [year, month, day] = String(dateValue).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error('Invalid attendance date');
  }

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function notifyStudentsByEmail({ classLevel, section, subject, heading, message, meta = [] }) {
  try {
    if (!classLevel || !section) return;

    const students = await User.find({
      role: 'student',
      classLevel: String(classLevel),
      section: String(section).toUpperCase(),
    }).select('email');

    const recipients = students
      .map((student) => student.email?.trim().toLowerCase())
      .filter(Boolean);

    if (!recipients.length) return;

    await sendNotificationEmail({
      recipients,
      subject,
      heading,
      message,
      meta,
    });
  } catch (err) {
    console.error('Student notification email failed:', err.message);
  }
}

// ==================== TIMETABLE ====================
router.get('/timetable', async (req, res) => {
  try { res.json(await Timetable.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/timetable', async (req, res) => {
  try {
    const { subject, teacherName, roomNumber, classLevel, section, day, startTime, startPeriod, endTime, endPeriod } = req.body;
    const entry = new Timetable({
      subject,
      teacherName,
      roomNumber,
      classLevel,
      section,
      day,
      startTime,
      startPeriod,
      endTime,
      endPeriod,
      createdBy: req.user.id
    });
    const savedEntry = await entry.save();

    await notifyStudentsByEmail({
      classLevel,
      section,
      subject: `Class Change Alert: ${subject || 'Schedule Update'}`,
      heading: 'Class timetable updated',
      message: `A class update has been posted for Class ${classLevel} Section ${section}.`,
      meta: [
        `Subject: ${subject || '--'}`,
        `Day: ${day || '--'}`,
        `Start Time: ${startTime || '--'} ${startPeriod || ''}`.trim(),
        `End Time: ${endTime || '--'} ${endPeriod || ''}`.trim(),
        `Teacher: ${teacherName || '--'}`,
        `Room No.: ${roomNumber || '--'}`,
      ],
    });

    res.json(savedEntry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/timetable/:id', async (req, res) => {
  try {
    const { subject, teacherName, roomNumber, classLevel, section, day, startTime, startPeriod, endTime, endPeriod } = req.body;
    const updated = await Timetable.findByIdAndUpdate(
      req.params.id,
      { subject, teacherName, roomNumber, classLevel, section, day, startTime, startPeriod, endTime, endPeriod },
      { new: true }
    );

    await notifyStudentsByEmail({
      classLevel,
      section,
      subject: `Class Change Alert: ${subject || 'Schedule Update'}`,
      heading: 'Class timetable changed',
      message: `Your class schedule has changed for Class ${classLevel} Section ${section}.`,
      meta: [
        `Subject: ${subject || '--'}`,
        `Day: ${day || '--'}`,
        `Start Time: ${startTime || '--'} ${startPeriod || ''}`.trim(),
        `End Time: ${endTime || '--'} ${endPeriod || ''}`.trim(),
        `Teacher: ${teacherName || '--'}`,
        `Room No.: ${roomNumber || '--'}`,
      ],
    });

    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/timetable/:id', async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== ANNOUNCEMENTS ====================
router.get('/announcements', async (req, res) => {
  try {
    res.json(await Announcement.find().sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, body, urgency, classLevel, section } = req.body;
    const ann = new Announcement({ title, body, urgency, classLevel, section, createdBy: req.user.id });
    const savedAnnouncement = await ann.save();

    await notifyStudentsByEmail({
      classLevel,
      section,
      subject: `New Announcement: ${title || 'Class Update'}`,
      heading: 'A new announcement has been posted',
      message: body || 'Please check the latest classroom announcement in your dashboard.',
      meta: [
        `Class: ${classLevel || '--'}`,
        `Section: ${section || '--'}`,
        `Priority: ${urgency || 'normal'}`,
      ],
    });

    res.json(savedAnnouncement);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== MATERIALS (PDF Upload) ====================
router.get('/materials', async (req, res) => {
  try {
    res.json(await Material.find().sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/materials', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please upload a PDF file' });

    const { title, course, classLevel, section } = req.body;
    const sizeKB = (req.file.size / 1024).toFixed(1);
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    const material = new Material({
      title: title || req.file.originalname,
      filename: req.file.originalname,
      filepath: req.file.filename,
      size: sizeStr,
      course: course || 'General',
      classLevel,
      section,
      createdBy: req.user.id
    });
    const savedMaterial = await material.save();

    await notifyStudentsByEmail({
      classLevel,
      section,
      subject: `New Material Uploaded: ${title || req.file.originalname}`,
      heading: 'New study material uploaded',
      message: `A new material has been uploaded for Class ${classLevel} Section ${section}.`,
      meta: [
        `Title: ${title || req.file.originalname}`,
        `Course: ${course || 'General'}`,
        `File: ${req.file.originalname}`,
        `Size: ${sizeStr}`,
      ],
    });

    res.json(savedMaterial);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/materials/:id', async (req, res) => {
  try {
    const mat = await Material.findByIdAndDelete(req.params.id);
    if (mat) {
      // Optionally delete file from disk
      const fs = require('fs');
      const filePath = path.join(__dirname, '../uploads', mat.filepath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ msg: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== MARKS ====================
router.get('/marks', async (req, res) => {
  try {
    res.json(await Mark.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marks', async (req, res) => {
  try {
    const { studentName, studentEmail, classLevel, section, subject, examType, score, maxScore, remarks } = req.body;

    if (!studentName || !studentEmail || !classLevel || !section || !subject || !examType || score === undefined || !maxScore) {
      return res.status(400).json({ error: 'Please fill all required mark fields' });
    }

    const mark = new Mark({
      studentName,
      studentEmail,
      classLevel,
      section,
      subject,
      examType,
      score,
      maxScore,
      remarks: remarks || '',
      createdBy: req.user.id
    });

    res.json(await mark.save());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/marks/:id', async (req, res) => {
  try {
    const { studentName, studentEmail, classLevel, section, subject, examType, score, maxScore, remarks } = req.body;
    const updated = await Mark.findByIdAndUpdate(
      req.params.id,
      { studentName, studentEmail, classLevel, section, subject, examType, score, maxScore, remarks: remarks || '' },
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/marks/:id', async (req, res) => {
  try {
    await Mark.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ATTENDANCE ====================
router.get('/attendance', async (req, res) => {
  try {
    res.json(await Attendance.find().sort({ date: -1, createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance/students', async (req, res) => {
  try {
    const { classLevel, section } = req.query;
    if (!classLevel || !section) {
      return res.status(400).json({ error: 'Class and section are required' });
    }

    const students = await User.find({
      role: 'student',
      classLevel: String(classLevel),
      section: String(section).toUpperCase(),
    })
      .select('name email classLevel section rollNumber profilePicture')
      .sort({ rollNumber: 1, name: 1 });

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { studentName, studentEmail, classLevel, section, subject, date, status, remarks } = req.body;

    if (!studentName || !studentEmail || !classLevel || !section || !subject || !date || !status) {
      return res.status(400).json({ error: 'Please fill all required attendance fields' });
    }

    const attendance = new Attendance({
      studentName,
      studentEmail,
      classLevel,
      section,
      subject,
      date,
      status,
      remarks: remarks || '',
      createdBy: req.user.id,
    });

    res.json(await attendance.save());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attendance/bulk', async (req, res) => {
  try {
    const { classLevel, section, subject, date, records } = req.body;

    if (!classLevel || !section || !subject || !date || !Array.isArray(records) || !records.length) {
      return res.status(400).json({ error: 'Class, section, subject, date, and student records are required' });
    }

    const normalizedSection = String(section).toUpperCase();
    const { start, end } = getDateRange(date);

    await Attendance.deleteMany({
      classLevel: String(classLevel),
      section: normalizedSection,
      subject: String(subject).trim(),
      date: { $gte: start, $lt: end },
    });

    const docs = records.map((record) => ({
      studentName: String(record.studentName || '').trim(),
      studentEmail: String(record.studentEmail || '').trim().toLowerCase(),
      classLevel: String(classLevel),
      section: normalizedSection,
      subject: String(subject).trim(),
      date: start,
      status: record.status === 'absent' ? 'absent' : 'present',
      remarks: String(record.remarks || '').trim(),
      createdBy: req.user.id,
    })).filter((record) => record.studentName && record.studentEmail);

    if (!docs.length) {
      return res.status(400).json({ error: 'No valid student attendance records were provided' });
    }

    const saved = await Attendance.insertMany(docs);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/attendance/:id', async (req, res) => {
  try {
    const { studentName, studentEmail, classLevel, section, subject, date, status, remarks } = req.body;
    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      { studentName, studentEmail, classLevel, section, subject: subject || '', date, status, remarks: remarks || '' },
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/attendance/:id', async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subjects', async (req, res) => {
  res.json(SUBJECTS_BY_CLASS);
});

module.exports = router;
