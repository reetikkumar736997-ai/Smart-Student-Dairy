module.exports = function (req, res, next) {
  // Check if req.user exists (set by authMiddleware) and is a teacher
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied: Teacher privileges required.' });
  }
  next();
};
