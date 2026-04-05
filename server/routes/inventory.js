const express = require('express');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Allowed sort columns (whitelist prevents SQL injection in ORDER BY)
const SORT_COLS   = ['item_id', 'item_name', 'quantity', 'warehouse_location', 'available_date', 'expiry_date'];
const SORT_ORDERS = ['ASC', 'DESC'];

// GET /api/inventory — paginated, searchable, sortable
router.get('/', authenticate, (req, res) => {
  const {
    page      = 1,
    limit     = 20,
    search    = '',
    sortBy    = 'item_id',
    sortOrder = 'ASC',
  } = req.query;

  const col   = SORT_COLS.includes(sortBy)                  ? sortBy                  : 'item_id';
  const order = SORT_ORDERS.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

  const offset  = (parseInt(page) - 1) * parseInt(limit);
  const pattern = `%${search}%`;

  const items = db.prepare(`
    SELECT * FROM inventory
    WHERE item_name LIKE ? OR CAST(item_id AS TEXT) LIKE ?
    ORDER BY ${col} ${order}
    LIMIT ? OFFSET ?
  `).all(pattern, pattern, parseInt(limit), offset);

  const { count: total } = db.prepare(`
    SELECT COUNT(*) AS count FROM inventory
    WHERE item_name LIKE ? OR CAST(item_id AS TEXT) LIKE ?
  `).get(pattern, pattern);

  res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/inventory/stats — dashboard summary (must be before /:id if ever added)
router.get('/stats', authenticate, (req, res) => {
  const today        = new Date().toISOString().split('T')[0];
  const in7Days      = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const { count: totalItems    } = db.prepare('SELECT COUNT(*) AS count FROM inventory').get();
  const { total: totalQuantity } = db.prepare('SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory').get();
  const { count: expiringSoon  } = db.prepare(
    'SELECT COUNT(*) AS count FROM inventory WHERE expiry_date <= ?'
  ).get(in7Days);
  const { count: lowStock      } = db.prepare(
    'SELECT COUNT(*) AS count FROM inventory WHERE quantity < 10'
  ).get();
  const { count: recentPurchases } = db.prepare(
    'SELECT COUNT(*) AS count FROM purchases WHERE purchase_date >= ?'
  ).get(sevenDaysAgo);

  res.json({ totalItems, totalQuantity, expiringSoon, lowStock, recentPurchases });
});

// GET /api/inventory/expiring — items expiring within 7 days (or already expired)
router.get('/expiring', authenticate, (req, res) => {
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const items = db.prepare(`
    SELECT * FROM inventory
    WHERE expiry_date <= ?
    ORDER BY expiry_date ASC
  `).all(in7Days);

  res.json(items);
});

module.exports = router;
