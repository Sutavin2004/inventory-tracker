/**
 * Public store routes — no authentication required.
 * Also includes slug-scoped customer/cart/order routes for the test suite.
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate, requireCustomer, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Middleware: verify customer auth AND that their companyId matches the slug's company
function requireSlugCustomer(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  // Verify slug matches the customer's company
  const company = db.prepare('SELECT * FROM companies WHERE slug = ?').get(req.params.slug);
  if (!company || !company.is_active) {
    return res.status(404).json({ error: 'Store not found' });
  }
  if (req.user.companyId !== company.id) {
    return res.status(403).json({ error: 'You are not a customer of this store' });
  }
  req.company = company;
  next();
}

function generateOrderNumber() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `ORD-${ts}-${rnd}`;
}

// ─── Helper: resolve company by slug ─────────────────────────────────────────

function getCompany(slug) {
  return db.prepare('SELECT * FROM companies WHERE slug = ?').get(slug);
}

// GET /api/store/:slug — store info + featured products
router.get('/:slug', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const featured = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ? AND p.is_published = 1 AND p.is_featured = 1
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all(company.id);

  // Strip sensitive fields
  const { tax_rate, shipping_fee, ...publicInfo } = company;

  res.json({
    store: {
      ...publicInfo,
      tax_rate,
      shipping_fee,
    },
    featured,
  });
});

// GET /api/store/:slug/categories
router.get('/:slug/categories', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) return res.status(404).json({ error: 'Store not found' });

  const cats = db.prepare(`
    SELECT DISTINCT category FROM products
    WHERE company_id = ? AND is_published = 1 AND category IS NOT NULL AND category != ''
    ORDER BY category ASC
  `).all(company.id);

  res.json(cats.map(r => r.category));
});

// GET /api/store/:slug/products/featured — featured products
router.get('/:slug/products/featured', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) return res.status(404).json({ error: 'Store not found' });

  const featured = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ? AND p.is_published = 1 AND p.is_featured = 1
      AND COALESCE(i.quantity, 999) > 0
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all(company.id);

  res.json(featured);
});

// GET /api/store/:slug/products — published products with filters + pagination
router.get('/:slug/products', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) return res.status(404).json({ error: 'Store not found' });

  const {
    page      = 1,
    limit     = 24,
    search    = '',
    category  = '',
    minPrice  = '',
    maxPrice  = '',
    inStock   = '',
    sortBy    = 'created_at',
    sortOrder = 'DESC',
  } = req.query;

  const ALLOWED_SORT = ['price', 'product_name', 'created_at'];
  const col   = ALLOWED_SORT.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let sql    = `
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location,
      COALESCE(i.expiry_date, '') AS expiry_date,
      COALESCE(i.available_date, '') AS available_date
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ? AND p.is_published = 1
  `;
  const params = [company.id];

  if (search) {
    sql += ' AND (p.product_name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
    const pat = `%${search}%`;
    params.push(pat, pat, pat);
  }
  if (category) {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (minPrice !== '') {
    sql += ' AND p.price >= ?';
    params.push(parseFloat(minPrice));
  }
  if (maxPrice !== '') {
    sql += ' AND p.price <= ?';
    params.push(parseFloat(maxPrice));
  }
  if (inStock === 'true') {
    sql += ' AND COALESCE(i.quantity, 0) > 0';
  }

  const countSql = sql.replace(
    /SELECT p\.\*.*?FROM products p/s,
    'SELECT COUNT(*) AS count FROM products p'
  );
  const { count: total } = db.prepare(countSql).get(...params);

  sql += ` ORDER BY ${col} ${order} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const products = db.prepare(sql).all(...params);
  res.json({ products, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/store/:slug/products/:id — single product detail
router.get('/:slug/products/:id', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company || !company.is_active) return res.status(404).json({ error: 'Store not found' });

  const product = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity,
      COALESCE(i.warehouse_location, '') AS warehouse_location,
      COALESCE(i.expiry_date, '') AS expiry_date,
      COALESCE(i.available_date, '') AS available_date
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.id = ? AND p.company_id = ? AND p.is_published = 1
  `).get(req.params.id, company.id);

  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Related products from same category
  const related = db.prepare(`
    SELECT p.*,
      COALESCE(i.quantity, 0) AS stock_quantity
    FROM products p
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE p.company_id = ? AND p.is_published = 1
      AND p.category = ? AND p.id != ?
    ORDER BY RANDOM()
    LIMIT 4
  `).all(company.id, product.category || '', product.id);

  res.json({ product, related });
});

// GET /api/store/:slug/products/:id/reviews
router.get('/:slug/products/:id/reviews', (req, res) => {
  const company = getCompany(req.params.slug);
  if (!company) return res.status(404).json({ error: 'Store not found' });

  const reviews = db.prepare(`
    SELECT pr.*, c.full_name AS reviewer_name
    FROM product_reviews pr
    JOIN customers c ON c.id = pr.customer_id
    WHERE pr.product_id = ? AND pr.company_id = ? AND pr.is_approved = 1
    ORDER BY pr.created_at DESC
  `).all(req.params.id, company.id);

  const { avg_rating } = db.prepare(
    'SELECT COALESCE(AVG(rating), 0) AS avg_rating FROM product_reviews WHERE product_id = ? AND is_approved = 1'
  ).get(req.params.id);

  res.json({ reviews, avg_rating: Math.round(avg_rating * 10) / 10 });
});

// ─── Slug-scoped customer routes ─────────────────────────────────────────────

// POST /api/store/:slug/customer/register
router.post('/:slug/customer/register', (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email, and password are required' });
  }

  const company = db.prepare('SELECT * FROM companies WHERE slug = ?').get(req.params.slug);
  if (!company || !company.is_active) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const existing = db.prepare('SELECT id FROM customers WHERE company_id = ? AND email = ?')
    .get(company.id, email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists for this store' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO customers (company_id, full_name, email, password_hash) VALUES (?, ?, ?, ?)
  `).run(company.id, full_name.trim(), email.toLowerCase().trim(), hash);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign(
    { customerId: customer.id, companyId: company.id, role: 'customer',
      full_name: customer.full_name, email: customer.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    customer: { id: customer.id, full_name: customer.full_name, email: customer.email, companyId: company.id },
  });
});

// POST /api/store/:slug/customer/login
router.post('/:slug/customer/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const company = db.prepare('SELECT * FROM companies WHERE slug = ?').get(req.params.slug);
  if (!company || !company.is_active) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE company_id = ? AND email = ?')
    .get(company.id, email.toLowerCase().trim());

  if (!customer || !bcrypt.compareSync(password, customer.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!customer.is_active) {
    return res.status(403).json({ error: 'Your account has been deactivated' });
  }

  const token = jwt.sign(
    { customerId: customer.id, companyId: company.id, role: 'customer',
      full_name: customer.full_name, email: customer.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    customer: { id: customer.id, full_name: customer.full_name, email: customer.email, companyId: company.id },
  });
});

// ─── Slug-scoped cart routes ──────────────────────────────────────────────────

// GET /api/store/:slug/cart
router.get('/:slug/cart', requireSlugCustomer, (req, res) => {
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, ci.product_id,
      p.product_name, p.price, p.images, p.category,
      COALESCE(i.quantity, 0) AS stock_quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE ci.customer_id = ? AND ci.company_id = ?
    ORDER BY ci.added_at DESC
  `).all(req.user.customerId, req.user.companyId);
  res.json({ items });
});

// POST /api/store/:slug/cart
router.post('/:slug/cart', requireSlugCustomer, (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ? AND is_published = 1')
    .get(product_id, req.user.companyId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const inv = product.inventory_item_id
    ? db.prepare('SELECT quantity FROM inventory WHERE item_id = ?').get(product.inventory_item_id)
    : null;
  const stock = inv ? inv.quantity : 999;
  if (stock < 1) return res.status(400).json({ error: 'Item is out of stock' });

  const existing = db.prepare('SELECT * FROM cart_items WHERE customer_id = ? AND product_id = ?')
    .get(req.user.customerId, product_id);

  if (existing) {
    const newQty = Math.min(existing.quantity + parseInt(quantity), stock);
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (company_id, customer_id, product_id, quantity) VALUES (?, ?, ?, ?)')
      .run(req.user.companyId, req.user.customerId, product_id, Math.min(parseInt(quantity), stock));
  }

  res.json({ success: true });
});

// DELETE /api/store/:slug/cart/:id
router.delete('/:slug/cart/:id', requireSlugCustomer, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ? AND customer_id = ?')
    .run(req.params.id, req.user.customerId);
  res.json({ success: true });
});

// ─── Slug-scoped order routes ─────────────────────────────────────────────────

// POST /api/store/:slug/orders
router.post('/:slug/orders', requireSlugCustomer, (req, res) => {
  const { shipping_address, payment_method = 'simulated', discount_id, notes } = req.body;
  if (!shipping_address) return res.status(400).json({ error: 'shipping_address is required' });

  const cartItems = db.prepare(`
    SELECT ci.*, p.product_name, p.price, p.inventory_item_id,
      COALESCE(i.quantity, 999) AS stock_quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE ci.customer_id = ? AND ci.company_id = ?
  `).all(req.user.customerId, req.user.companyId);

  if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });

  for (const item of cartItems) {
    if (item.stock_quantity < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for "${item.product_name}"` });
    }
  }

  const company = req.company;
  if (!company.accept_orders) {
    return res.status(400).json({ error: 'This store is not accepting orders at this time' });
  }

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  let discountSavings = 0;
  if (discount_id) {
    const disc = db.prepare('SELECT * FROM discount_codes WHERE id = ? AND company_id = ? AND is_active = 1')
      .get(discount_id, req.user.companyId);
    if (disc) {
      discountSavings = disc.discount_type === 'percentage'
        ? subtotal * (disc.discount_value / 100)
        : Math.min(disc.discount_value, subtotal);
      db.prepare('UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = ?').run(disc.id);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountSavings);
  const shippingAmount = (company.free_shipping_threshold > 0 && discountedSubtotal >= company.free_shipping_threshold)
    ? 0 : company.shipping_fee;
  const taxAmount  = discountedSubtotal * company.tax_rate;
  const total      = discountedSubtotal + shippingAmount + taxAmount;
  const orderNumber = generateOrderNumber();

  db.transaction(() => {
    const orderId = db.prepare(`
      INSERT INTO orders (company_id, customer_id, order_number, status, subtotal, tax_amount,
        shipping_amount, total_amount, shipping_address, payment_method, payment_status, notes, updated_at)
      VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, 'paid', ?, datetime('now'))
    `).run(
      req.user.companyId, req.user.customerId, orderNumber,
      discountedSubtotal, taxAmount, shippingAmount, total,
      typeof shipping_address === 'string' ? shipping_address : JSON.stringify(shipping_address),
      payment_method, notes || null
    ).lastInsertRowid;

    for (const item of cartItems) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderId, item.product_id, item.product_name, item.quantity, item.price, item.price * item.quantity);

      if (item.inventory_item_id) {
        db.prepare('UPDATE inventory SET quantity = quantity - ?, last_updated = ? WHERE item_id = ?')
          .run(item.quantity, new Date().toISOString(), item.inventory_item_id);
      }
    }

    db.prepare('DELETE FROM cart_items WHERE customer_id = ? AND company_id = ?')
      .run(req.user.customerId, req.user.companyId);

    // Audit log: PURCHASE
    try {
      db.prepare(`
        INSERT INTO audit_log (company_id, action, performed_by, notes, timestamp)
        VALUES (?, 'PURCHASE', ?, ?, datetime('now'))
      `).run(req.user.companyId, `customer:${req.user.customerId}`, `Order ${orderNumber}, total $${total.toFixed(2)}`);
    } catch (_) {}
  })();

  res.status(201).json({ success: true, order_number: orderNumber, total });
});

// GET /api/store/:slug/orders
router.get('/:slug/orders', requireSlugCustomer, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
    FROM orders o
    WHERE o.customer_id = ? AND o.company_id = ?
    ORDER BY o.placed_at DESC
  `).all(req.user.customerId, req.user.companyId);
  res.json({ orders });
});

module.exports = router;
