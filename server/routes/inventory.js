const express = require('express');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Allowed sort columns (whitelist prevents SQL injection in ORDER BY)
const SORT_COLS   = ['item_id', 'item_name', 'quantity', 'warehouse_location', 'available_date', 'expiry_date'];
const SORT_ORDERS = ['ASC', 'DESC'];

// GET /api/inventory — paginated, searchable, sortable
// Includes product info (price, is_published, product_id) when user has a companyId
router.get('/', authenticate, (req, res) => {
  const {
    page      = 1,
    limit     = 20,
    search    = '',
    sortBy    = 'item_id',
    sortOrder = 'ASC',
  } = req.query;

  const col     = SORT_COLS.includes(sortBy)                   ? sortBy                  : 'item_id';
  const order   = SORT_ORDERS.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';
  const offset  = (parseInt(page) - 1) * parseInt(limit);
  const pattern = `%${search}%`;
  const companyId = req.user?.companyId;

  if (companyId) {
    // Return inventory filtered AND joined with product info for this company
    const items = db.prepare(`
      SELECT i.*,
        p.id            AS product_id,
        p.price         AS product_price,
        p.is_published  AS product_is_published
      FROM inventory i
      LEFT JOIN products p
        ON p.inventory_item_id = i.item_id AND p.company_id = ?
      WHERE (i.company_id = ? OR i.company_id IS NULL)
        AND (i.item_name LIKE ? OR CAST(i.item_id AS TEXT) LIKE ?)
      ORDER BY i.${col} ${order}
      LIMIT ? OFFSET ?
    `).all(companyId, companyId, pattern, pattern, parseInt(limit), offset);

    const { count: total } = db.prepare(`
      SELECT COUNT(*) AS count FROM inventory i
      WHERE (i.company_id = ? OR i.company_id IS NULL)
        AND (i.item_name LIKE ? OR CAST(i.item_id AS TEXT) LIKE ?)
    `).get(companyId, pattern, pattern);

    return res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
  }

  // Fallback: no company context
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

// POST /api/inventory — add a single inventory item (admin only)
router.post('/', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { item_id, item_name, quantity, warehouse_location, available_date, expiry_date } = req.body;
  if (!item_name || quantity === undefined || !warehouse_location || !available_date || !expiry_date) {
    return res.status(400).json({
      error: 'item_name, quantity, warehouse_location, available_date, and expiry_date are required',
    });
  }

  const lastUpdated = new Date().toISOString();
  const companyId   = req.user.companyId;

  try {
    let newItemId;
    if (item_id) {
      newItemId = parseInt(item_id);
      db.prepare(`
        INSERT INTO inventory (item_id, item_name, quantity, warehouse_location, available_date, expiry_date, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(newItemId, item_name.trim(), parseInt(quantity), warehouse_location.trim(), available_date, expiry_date, lastUpdated);
    } else {
      const { maxId } = db.prepare('SELECT COALESCE(MAX(item_id), 0) AS maxId FROM inventory').get();
      newItemId = maxId + 1;
      db.prepare(`
        INSERT INTO inventory (item_id, item_name, quantity, warehouse_location, available_date, expiry_date, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(newItemId, item_name.trim(), parseInt(quantity), warehouse_location.trim(), available_date, expiry_date, lastUpdated);
    }

    // Auto-create product record for this company
    if (companyId) {
      const exists = db.prepare('SELECT id FROM products WHERE company_id = ? AND inventory_item_id = ?')
        .get(companyId, newItemId);
      if (!exists) {
        db.prepare(`
          INSERT INTO products (company_id, inventory_item_id, product_name, price, is_published, category)
          VALUES (?, ?, ?, 0, 1, 'General')
        `).run(companyId, newItemId, item_name.trim());
      }
    }

    const item = db.prepare('SELECT * FROM inventory WHERE item_id = ?').get(newItemId);
    res.status(201).json(item);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'An item with this ID already exists' });
    }
    throw e;
  }
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
