/**
 * Store-admin routes: products, orders, customers, discounts, store settings.
 * All routes require authenticate + requireAdmin middleware.
 * companyId is sourced from req.user.companyId (set via JWT).
 */
const express = require('express');
const stripe  = require('../stripe');
const db      = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require store admin auth
router.use(authenticate, requireAdmin);

// ─── Helper: resolve companyId from JWT or DB (fallback for old tokens) ───────

function getCompanyId(req) {
  if (req.user.companyId) return req.user.companyId;
  // Fallback for tokens issued before companyId was added to JWT
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(req.user.id);
  return user?.company_id;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/products
router.get('/products', (req, res) => {
  const companyId = getCompanyId(req);
  const products = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ?
    ORDER BY p.created_at DESC
  `).all(companyId);
  res.json(products);
});

// POST /api/admin/products
router.post('/products', (req, res) => {
  const companyId = getCompanyId(req);
  const {
    inventory_item_id, product_name, description, price, compare_at_price,
    category, tags, images, is_published = 1, is_featured = 0, sku, weight_kg,
  } = req.body;

  if (!product_name) return res.status(400).json({ error: 'product_name is required' });
  if (price === undefined || price === null) return res.status(400).json({ error: 'price is required' });

  const result = db.prepare(`
    INSERT INTO products
      (company_id, inventory_item_id, product_name, description, price, compare_at_price,
       category, tags, images, is_published, is_featured, sku, weight_kg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    inventory_item_id || null, product_name.trim(), description || null,
    parseFloat(price), compare_at_price ? parseFloat(compare_at_price) : null,
    category || null, tags || null,
    images ? JSON.stringify(images) : null,
    is_published ? 1 : 0, is_featured ? 1 : 0,
    sku || null, weight_kg ? parseFloat(weight_kg) : null,
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

// PUT /api/admin/products/:id
router.put('/products/:id', (req, res) => {
  const companyId = getCompanyId(req);
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ?')
    .get(req.params.id, companyId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const {
    inventory_item_id, product_name, description, price, compare_at_price,
    category, tags, images, is_published, is_featured, sku, weight_kg,
  } = req.body;

  db.prepare(`
    UPDATE products SET
      inventory_item_id = ?, product_name = ?, description = ?, price = ?,
      compare_at_price = ?, category = ?, tags = ?, images = ?,
      is_published = ?, is_featured = ?, sku = ?, weight_kg = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    inventory_item_id !== undefined ? inventory_item_id : product.inventory_item_id,
    product_name || product.product_name,
    description !== undefined ? description : product.description,
    price !== undefined ? parseFloat(price) : product.price,
    compare_at_price !== undefined ? (compare_at_price ? parseFloat(compare_at_price) : null) : product.compare_at_price,
    category !== undefined ? category : product.category,
    tags !== undefined ? tags : product.tags,
    images !== undefined ? (images ? JSON.stringify(images) : null) : product.images,
    is_published !== undefined ? (is_published ? 1 : 0) : product.is_published,
    is_featured  !== undefined ? (is_featured  ? 1 : 0) : product.is_featured,
    sku !== undefined ? sku : product.sku,
    weight_kg !== undefined ? (weight_kg ? parseFloat(weight_kg) : null) : product.weight_kg,
    product.id,
  );

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(product.id));
});

// DELETE /api/admin/products/:id (soft delete — unpublish)
router.delete('/products/:id', (req, res) => {
  const companyId = getCompanyId(req);
  const product = db.prepare('SELECT id FROM products WHERE id = ? AND company_id = ?')
    .get(req.params.id, companyId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  db.prepare("UPDATE products SET is_published = 0, updated_at = datetime('now') WHERE id = ?").run(product.id);
  res.json({ success: true });
});

// POST /api/admin/products/bulk — bulk publish/unpublish
router.post('/products/bulk', (req, res) => {
  const companyId = getCompanyId(req);
  const { ids, is_published } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE products SET is_published = ?, updated_at = datetime('now')
    WHERE id IN (${placeholders}) AND company_id = ?
  `).run(is_published ? 1 : 0, ...ids, companyId);

  res.json({ success: true, updated: ids.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/orders
router.get('/orders', (req, res) => {
  const companyId = getCompanyId(req);
  const { status, startDate, endDate, customerName, page = 1, limit = 50 } = req.query;

  let sql = `
    SELECT o.*, c.full_name AS customer_name, c.email AS customer_email,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.company_id = ?
  `;
  const params = [companyId];

  if (status)       { sql += ' AND o.status = ?';             params.push(status); }
  if (startDate)    { sql += ' AND date(o.placed_at) >= ?';   params.push(startDate); }
  if (endDate)      { sql += ' AND date(o.placed_at) <= ?';   params.push(endDate); }
  if (customerName) { sql += ' AND c.full_name LIKE ?';       params.push(`%${customerName}%`); }

  const countSql = sql.replace(
    /SELECT o\.\*.*?FROM orders o/s,
    'SELECT COUNT(*) AS count FROM orders o'
  );
  const { count: total } = db.prepare(countSql).get(...params);

  sql += ' ORDER BY o.placed_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  res.json({ orders: db.prepare(sql).all(...params), total, page: parseInt(page) });
});

// GET /api/admin/orders/:id
router.get('/orders/:id', (req, res) => {
  const companyId = getCompanyId(req);
  const order = db.prepare(`
    SELECT o.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
    FROM orders o JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ? AND o.company_id = ?
  `).get(req.params.id, companyId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', (req, res) => {
  const companyId = getCompanyId(req);
  const { status } = req.body;
  const VALID = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
  if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const order = db.prepare('SELECT id FROM orders WHERE id = ? AND company_id = ?')
    .get(req.params.id, companyId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, order.id);
  res.json({ success: true });
});

// POST /api/admin/orders/:id/refund — issue Stripe refund + optionally restore inventory
router.post('/orders/:id/refund', async (req, res) => {
  const companyId = getCompanyId(req);
  const order = db.prepare(`
    SELECT o.*, c.full_name AS customer_name
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ? AND o.company_id = ?
  `).get(req.params.id, companyId);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!order.stripe_payment_intent_id) {
    return res.status(400).json({ error: 'No Stripe payment found for this order' });
  }

  if (order.payment_status === 'refunded') {
    return res.status(400).json({ error: 'Order has already been fully refunded' });
  }

  const { amount, reason } = req.body;
  const isFullRefund = !amount || parseFloat(amount) >= order.total_amount;
  const refundAmountCents = amount ? Math.round(parseFloat(amount) * 100) : undefined;

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      ...(refundAmountCents ? { amount: refundAmountCents } : {}),
      reason: 'requested_by_customer',
    });

    db.prepare(`
      UPDATE orders SET
        payment_status = ?,
        refund_amount  = ?,
        refund_reason  = ?,
        refunded_at    = datetime('now'),
        status         = ?,
        updated_at     = datetime('now')
      WHERE id = ?
    `).run(
      isFullRefund ? 'refunded' : 'paid',
      amount ? parseFloat(amount) : order.total_amount,
      reason || 'Refunded by store admin',
      isFullRefund ? 'refunded' : order.status,
      order.id,
    );

    // Restore inventory on full refund
    if (isFullRefund) {
      const items = db.prepare(`
        SELECT oi.*, p.inventory_item_id
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `).all(order.id);

      db.transaction(() => {
        for (const item of items) {
          if (item.inventory_item_id) {
            db.prepare(`
              UPDATE inventory SET quantity = quantity + ?, last_updated = datetime('now')
              WHERE item_id = ?
            `).run(item.quantity, item.inventory_item_id);
          }

          try {
            db.prepare(`
              INSERT INTO audit_log (company_id, action, item_id, item_name, change_amount, performed_by, notes, timestamp)
              VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, ?, datetime('now'))
            `).run(
              companyId,
              item.inventory_item_id,
              item.product_name,
              item.quantity,
              req.user.username,
              `Refund for order ${order.order_number}`,
            );
          } catch (_) {}
        }
      })();
    }

    res.json({ success: true, refundId: refund.id });
  } catch (err) {
    console.error('Refund error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/orders/:id/cancel — cancel and restore inventory
router.put('/orders/:id/cancel', (req, res) => {
  const companyId = getCompanyId(req);
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND company_id = ?')
    .get(req.params.id, companyId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (['cancelled','refunded','delivered'].includes(order.status)) {
    return res.status(400).json({ error: `Cannot cancel an order with status: ${order.status}` });
  }

  const orderItems = db.prepare('SELECT oi.*, p.inventory_item_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?')
    .all(order.id);

  db.transaction(() => {
    // Restore inventory
    for (const item of orderItems) {
      if (item.inventory_item_id) {
        db.prepare('UPDATE inventory SET quantity = quantity + ?, last_updated = ? WHERE item_id = ?')
          .run(item.quantity, new Date().toISOString(), item.inventory_item_id);
      }
    }
    db.prepare("UPDATE orders SET status = 'cancelled', payment_status = 'refunded', updated_at = datetime('now') WHERE id = ?")
      .run(order.id);
  })();

  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/customers
router.get('/customers', (req, res) => {
  const companyId = getCompanyId(req);
  const { search, page = 1, limit = 50 } = req.query;

  let sql = `
    SELECT c.id, c.full_name, c.email, c.phone, c.created_at, c.is_active,
      COUNT(o.id) AS orders_count,
      COALESCE(SUM(o.total_amount), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.payment_status = 'paid'
    WHERE c.company_id = ?
  `;
  const params = [companyId];

  if (search) {
    sql += ' AND (c.full_name LIKE ? OR c.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  res.json(db.prepare(sql).all(...params));
});

// PUT /api/admin/customers/:id — toggle active
router.put('/customers/:id', (req, res) => {
  const companyId = getCompanyId(req);
  const { is_active } = req.body;
  const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND company_id = ?')
    .get(req.params.id, companyId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  db.prepare('UPDATE customers SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, customer.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DISCOUNT CODES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/discounts
router.get('/discounts', (req, res) => {
  const companyId = getCompanyId(req);
  res.json(db.prepare('SELECT * FROM discount_codes WHERE company_id = ? ORDER BY created_at DESC').all(companyId));
});

// POST /api/admin/discounts
router.post('/discounts', (req, res) => {
  const companyId = getCompanyId(req);
  const { code, discount_type, discount_value, min_order_amount = 0, max_uses, expires_at, is_active = 1 } = req.body;
  if (!code || !discount_type || discount_value === undefined) {
    return res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO discount_codes (company_id, code, discount_type, discount_value, min_order_amount, max_uses, expires_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(companyId, code.toUpperCase().trim(), discount_type, parseFloat(discount_value),
       parseFloat(min_order_amount), max_uses || null, expires_at || null, is_active ? 1 : 0);
    res.status(201).json(db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Discount code already exists' });
    throw e;
  }
});

// PUT /api/admin/discounts/:id
router.put('/discounts/:id', (req, res) => {
  const companyId = getCompanyId(req);
  const disc = db.prepare('SELECT * FROM discount_codes WHERE id = ? AND company_id = ?')
    .get(req.params.id, companyId);
  if (!disc) return res.status(404).json({ error: 'Discount code not found' });

  const { discount_value, min_order_amount, max_uses, expires_at, is_active } = req.body;
  db.prepare(`
    UPDATE discount_codes SET
      discount_value = ?, min_order_amount = ?, max_uses = ?, expires_at = ?, is_active = ?
    WHERE id = ?
  `).run(
    discount_value !== undefined ? parseFloat(discount_value) : disc.discount_value,
    min_order_amount !== undefined ? parseFloat(min_order_amount) : disc.min_order_amount,
    max_uses !== undefined ? max_uses : disc.max_uses,
    expires_at !== undefined ? expires_at : disc.expires_at,
    is_active !== undefined ? (is_active ? 1 : 0) : disc.is_active,
    disc.id,
  );
  res.json(db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(disc.id));
});

// DELETE /api/admin/discounts/:id
router.delete('/discounts/:id', (req, res) => {
  const companyId = getCompanyId(req);
  const disc = db.prepare('SELECT id FROM discount_codes WHERE id = ? AND company_id = ?')
    .get(req.params.id, companyId);
  if (!disc) return res.status(404).json({ error: 'Discount code not found' });
  db.prepare('DELETE FROM discount_codes WHERE id = ?').run(disc.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STORE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

// PUT /api/admin/store-settings
router.put('/store-settings', (req, res) => {
  const companyId = getCompanyId(req);
  const {
    display_name, store_tagline, store_description, store_banner_url,
    currency, tax_rate, shipping_fee, free_shipping_threshold,
    store_email, store_phone, store_address,
    accept_orders, maintenance_mode,
  } = req.body;

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  db.prepare(`
    UPDATE companies SET
      display_name = ?, store_tagline = ?, store_description = ?, store_banner_url = ?,
      currency = ?, tax_rate = ?, shipping_fee = ?, free_shipping_threshold = ?,
      store_email = ?, store_phone = ?, store_address = ?,
      accept_orders = ?, maintenance_mode = ?
    WHERE id = ?
  `).run(
    display_name || company.display_name,
    store_tagline !== undefined ? store_tagline : company.store_tagline,
    store_description !== undefined ? store_description : company.store_description,
    store_banner_url !== undefined ? store_banner_url : company.store_banner_url,
    currency || company.currency,
    tax_rate !== undefined ? parseFloat(tax_rate) : company.tax_rate,
    shipping_fee !== undefined ? parseFloat(shipping_fee) : company.shipping_fee,
    free_shipping_threshold !== undefined ? parseFloat(free_shipping_threshold) : company.free_shipping_threshold,
    store_email !== undefined ? store_email : company.store_email,
    store_phone !== undefined ? store_phone : company.store_phone,
    store_address !== undefined ? store_address : company.store_address,
    accept_orders !== undefined ? (accept_orders ? 1 : 0) : company.accept_orders,
    maintenance_mode !== undefined ? (maintenance_mode ? 1 : 0) : company.maintenance_mode,
    companyId,
  );

  res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId));
});

// GET /api/admin/store-settings
router.get('/store-settings', (req, res) => {
  const companyId = getCompanyId(req);
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
});

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', (req, res) => {
  const companyId = getCompanyId(req);
  const today = new Date().toISOString().split('T')[0];

  const { count: ordersToday }  = db.prepare(
    "SELECT COUNT(*) AS count FROM orders WHERE company_id = ? AND date(placed_at) = ?"
  ).get(companyId, today);

  const { total: revenueToday } = db.prepare(
    "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE company_id = ? AND date(placed_at) = ? AND payment_status = 'paid'"
  ).get(companyId, today);

  const { count: pendingOrders } = db.prepare(
    "SELECT COUNT(*) AS count FROM orders WHERE company_id = ? AND status = 'pending'"
  ).get(companyId);

  const { count: totalCustomers } = db.prepare(
    'SELECT COUNT(*) AS count FROM customers WHERE company_id = ?'
  ).get(companyId);

  // Best selling product this week
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const bestSelling = db.prepare(`
    SELECT oi.product_name, SUM(oi.quantity) AS total_sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.company_id = ? AND date(o.placed_at) >= ?
    GROUP BY oi.product_name
    ORDER BY total_sold DESC
    LIMIT 1
  `).get(companyId, sevenDaysAgo);

  res.json({ ordersToday, revenueToday, pendingOrders, totalCustomers, bestSelling });
});

module.exports = router;
