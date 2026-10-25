const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'eloan-pawnshop-secret-key-change-in-production-2026';
const JWT_EXPIRES_IN = '24h';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
}

function staffOrAdmin(req, res, next) {
  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff or administrator access required' });
  }
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware, adminOnly, staffOrAdmin, JWT_SECRET };
