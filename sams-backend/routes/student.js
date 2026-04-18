const express = require('express');
const auth = require('../middleware/authMiddleware');
const Groq = require('groq-sdk');
const Timetable = require('../models/Timetable');
const Announcement = require('../models/Announcement');
const Material = require('../models/Material');
const Mark = require('../models/Mark');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

const router = express.Router();
router.use(auth);

async function getStudentScope(userId) {
  const user = await User.findById(userId).select('email classLevel section');
  if (!user) return null;
  return {
    email: user.email?.toLowerCase(),
    classLevel: user.classLevel,
    section: user.section,
  };
}

// ==================== READ ROUTES ====================
router.get('/timetable', async (req, res) => {
  try {
    const scope = await getStudentScope(req.user.id);
    if (!scope?.classLevel || !scope?.section) return res.json([]);
    res.json(await Timetable.find({ classLevel: scope.classLevel, section: scope.section }).sort({ createdAt: -1 }));
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/announcements', async (req, res) => {
  try {
    const scope = await getStudentScope(req.user.id);
    if (!scope?.classLevel || !scope?.section) return res.json([]);
    res.json(await Announcement.find({ classLevel: scope.classLevel, section: scope.section }).sort({ createdAt: -1 }));
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/materials', async (req, res) => {
  try {
    const scope = await getStudentScope(req.user.id);
    if (!scope?.classLevel || !scope?.section) return res.json([]);
    res.json(await Material.find({ classLevel: scope.classLevel, section: scope.section }).sort({ createdAt: -1 }));
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/marks', async (req, res) => {
  try {
    const scope = await getStudentScope(req.user.id);
    if (!scope?.email) {
      return res.status(404).json({ error: 'Student email not found' });
    }

    const marks = await Mark.find({
      studentEmail: scope.email,
      classLevel: scope.classLevel,
      section: scope.section,
    }).sort({ createdAt: -1 });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const scope = await getStudentScope(req.user.id);
    if (!scope?.email) {
      return res.status(404).json({ error: 'Student email not found' });
    }

    const attendance = await Attendance.find({
      studentEmail: scope.email,
      classLevel: scope.classLevel,
      section: scope.section,
    }).sort({ date: -1, createdAt: -1 });

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AI CHAT (Groq - Study Only) ====================
const SYSTEM_PROMPT = `You are "Atelier AI", a strict Academic Study Assistant for the Intellectual Atelier Academic Management System (SAMS).

YOUR ROLE:
- You ONLY help students with academic and study-related topics.
- You can answer questions about: Mathematics, Physics, Chemistry, Biology, Computer Science, History, Geography, English, Literature, Economics, Political Science, Philosophy, Psychology, Engineering, Medicine, Law, and any other academic subject taught in schools or universities.
- You can help with: homework problems, concept explanations, exam preparation, study tips, solving equations, writing essays, understanding theories, formulas, definitions, and academic guidance.

STRICT RULES:
1. If a student asks about something NOT related to academics or studying (like cooking, recipes, gaming, movies, entertainment, gossip, personal advice, dating, social media, jokes unrelated to study, how to cook maggi, etc.), you MUST respond ONLY with:
   "🎓 I'm your Academic Study Assistant and I'm built for studying purposes only! I can help you with subjects like Maths, Science, History, English, and more. Please ask me an academic question and I'll be happy to help! 📚"
2. Do NOT answer any non-academic question, no matter how the student phrases it.
3. Be friendly, encouraging, and educational when answering study questions.
4. Use clear formatting with bullet points, numbered steps, and bold text for key concepts.
5. Keep responses concise but thorough.
6. If solving a math problem, show step-by-step solutions.
7. Always encourage the student to keep learning.`;

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.json({ 
        reply: "AI is not configured yet. Please add your GROQ_API_KEY to the backend .env file." 
      });
    }

    const groq = new Groq({ apiKey });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 1024,
    });

    const reply = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ reply });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'AI service error: ' + err.message });
  }
});

module.exports = router;
