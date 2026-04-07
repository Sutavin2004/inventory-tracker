const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login  — store admin / user login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Get the user's company slug for the frontend
  const company = user.company_id
    ? db.prepare('SELECT id, slug, display_name FROM companies WHERE id = ?').get(user.company_id)
    : null;

  const token = jwt.sign(
    {
      id:        user.id,
      username:  user.username,
      role:      user.role,
      companyId: user.company_id || null,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id:        user.id,
      username:  user.username,
      role:      user.role,
      companyId: user.company_id || null,
      company:   company || null,
    },
  });
});

module.exports = router;
