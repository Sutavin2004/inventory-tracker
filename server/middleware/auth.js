const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'inventory-app-secret-key-change-in-production';

/**
 * Verifies the Bearer JWT on every protected request.
 * Sets req.user = { id, username, role }.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Middleware that must be chained after authenticate. */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, JWT_SECRET };
