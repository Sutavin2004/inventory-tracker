const express = require('express');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate, requirePlatformAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Hardcoded super admin credentials
const SUPER_ADMIN_USER = 'superadmin';
const SUPER_ADMIN_PASS = 'superadmin123';

// POST /api/platform/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username !== SUPER_ADMIN_USER || password !== SUPER_ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid platform admin credentials' });
  }
  const token = jwt.sign({ role: 'superadmin', username: 'superadmin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { username: 'superadmin', role: 'superadmin' } });
});

// GET /api/platform/stats
router.get('/stats', authenticate, requirePlatformAdmin, (_req, res) => {
  const { count: totalCompanies }  = db.prepare('SELECT COUNT(*) AS count FROM companies').get();
  const { count: totalCustomers }  = db.prepare('SELECT COUNT(*) AS count FROM customers').get();
  const { count: totalOrders }     = db.prepare('SELECT COUNT(*) AS count FROM orders').get();
  const { count: totalProducts }   = db.prepare('SELECT COUNT(*) AS count FROM products WHERE is_published = 1').get();
  const { total: totalRevenue }    = db.prepare(
    "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE payment_status = 'paid'"
  ).get();

  const recentStores = db.prepare(`
    SELECT c.id, c.slug, c.display_name, c.created_at, c.is_active,
      (SELECT COUNT(*) FROM orders o WHERE o.company_id = c.id) AS order_count,
      (SELECT username FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) AS admin_username
    FROM companies c
    ORDER BY c.created_at DESC
    LIMIT 10
  `).all();

  res.json({ totalCompanies, totalCustomers, totalOrders, totalProducts, totalRevenue, recentStores });
});

// GET /api/platform/stores
router.get('/stores', authenticate, requirePlatformAdmin, (_req, res) => {
  const stores = db.prepare(`
    SELECT c.*,
      (SELECT username FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) AS admin_username,
      (SELECT COUNT(*) FROM inventory i
        JOIN products p ON p.inventory_item_id = i.item_id AND p.company_id = c.id) AS inventory_count,
      (SELECT COUNT(*) FROM orders o WHERE o.company_id = c.id) AS order_count,
      (SELECT COUNT(*) FROM customers cu WHERE cu.company_id = c.id) AS customer_count
    FROM companies c
    ORDER BY c.created_at DESC
  `).all();
  res.json(stores);
});

// PUT /api/platform/stores/:id — toggle active / maintenance
router.put('/stores/:id', authenticate, requirePlatformAdmin, (req, res) => {
  const { is_active, maintenance_mode } = req.body;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Store not found' });

  const newActive = is_active !== undefined ? (is_active ? 1 : 0) : company.is_active;
  const newMaint  = maintenance_mode !== undefined ? (maintenance_mode ? 1 : 0) : company.maintenance_mode;

  db.prepare('UPDATE companies SET is_active = ?, maintenance_mode = ? WHERE id = ?')
    .run(newActive, newMaint, company.id);

  res.json({ success: true });
});

module.exports = router;
