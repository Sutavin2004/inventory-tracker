const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ─── Helper: generate a unique slug from display_name ─────────────────────────

function generateSlug(displayName) {
  const base = displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Check uniqueness, append number if taken
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT id FROM companies WHERE slug = ?').get(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

// ─── POST /api/auth/register — create a new store ─────────────────────────────

router.post('/register', (req, res) => {
  const { display_name, username, password, email } = req.body;

  if (!display_name || !username || !password) {
    return res.status(400).json({ error: 'display_name, username, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check username not already taken
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existingUser) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const slug = generateSlug(display_name);
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    db.transaction(() => {
      // Create company
      const companyResult = db.prepare(`
        INSERT INTO companies (slug, display_name, primary_color, is_active, accept_orders)
        VALUES (?, ?, '#0F766E', 1, 1)
      `).run(slug, display_name.trim());

      const companyId = companyResult.lastInsertRowid;

      // Create first admin user for this company
      db.prepare(`
        INSERT INTO users (username, password_hash, role, company_id)
        VALUES (?, ?, 'admin', ?)
      `).run(username.trim(), passwordHash, companyId);
    })();

    res.status(201).json({
      success: true,
      slug,
      displayName: display_name.trim(),
      message: 'Store created successfully. Please sign in.',
    });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or store name already taken' });
    }
    throw e;
  }
});

// ─── GET /api/check-slug/:slug — check if slug is available ──────────────────

router.get('/check-slug/:slug', (req, res) => {
  const raw = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const taken = !!db.prepare('SELECT id FROM companies WHERE slug = ?').get(raw);
  res.json({ slug: raw, available: !taken });
});

// ─── POST /api/auth/login — store admin / user login ──────────────────────────

router.post('/login', (req, res) => {
  const { username, password, company_slug } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  let user;
  if (company_slug) {
    // Slug-scoped lookup (multi-tenant: find user in specific company)
    const company = db.prepare('SELECT id FROM companies WHERE slug = ?').get(company_slug);
    if (!company) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    user = db.prepare('SELECT * FROM users WHERE username = ? AND company_id = ?')
      .get(username.trim(), company.id);
  } else {
    // Global lookup (legacy / demo)
    user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Get the user's company info
  const company = user.company_id
    ? db.prepare('SELECT id, slug, display_name, primary_color, logo_url FROM companies WHERE id = ?').get(user.company_id)
    : null;

  const payload = {
    id:           user.id,
    username:     user.username,
    role:         user.role,
    type:         'admin',
    companyId:    user.company_id || null,
    companySlug:  company?.slug   || null,
    displayName:  company?.display_name || null,
    primaryColor: company?.primary_color || '#0F766E',
    logoUrl:      company?.logo_url || null,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      ...payload,
      company: company || null,
    },
  });
});

// ─── GET /api/auth/me — return current user from JWT ──────────────────────────

router.get('/me', authenticate, (req, res) => {
  const u = req.user;
  if (u.type === 'admin' || u.role === 'admin' || u.role === 'user') {
    const company = u.companyId
      ? db.prepare('SELECT id, slug, display_name, primary_color, logo_url FROM companies WHERE id = ?').get(u.companyId)
      : null;
    return res.json({ ...u, company });
  }
  res.json(u);
});

module.exports = router;
