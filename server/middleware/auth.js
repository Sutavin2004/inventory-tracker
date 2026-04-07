const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'inventory-app-secret-key-change-in-production';

/**
 * Verifies the Bearer JWT on every protected request.
 * Handles three token types:
 *   - Store admin/user: { id, username, role ('admin'|'user'), companyId }
 *   - Customer:         { customerId, companyId, role: 'customer', full_name, email }
 *   - Platform admin:   { role: 'superadmin' }
 * Sets req.user = decoded payload.
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

/** Must be chained after authenticate. Allows admin and user roles. */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/** Must be chained after authenticate. Allows only customer role. */
const requireCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  next();
};

/** Must be chained after authenticate. Allows only superadmin role. */
const requirePlatformAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Platform admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireCustomer, requirePlatformAdmin, JWT_SECRET };
