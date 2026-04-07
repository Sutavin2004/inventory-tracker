/**
 * Customer authentication + all customer-specific routes.
 * Auth routes: POST /api/customer/register, POST /api/customer/login
 * Protected routes require customer JWT (role: 'customer').
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate, requireCustomer, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderNumber() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `ORD-${ts}-${rnd}`;
}

// ─── POST /api/customer/register ─────────────────────────────────────────────

router.post('/register', (req, res) => {
  const { full_name, email, password, company_slug } = req.body;
  if (!full_name || !email || !password || !company_slug) {
    return res.status(400).json({ error: 'full_name, email, password, and company_slug are required' });
  }

  const company = db.prepare('SELECT * FROM companies WHERE slug = ?').get(company_slug);
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
    INSERT INTO customers (company_id, full_name, email, password_hash)
    VALUES (?, ?, ?, ?)
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

// ─── POST /api/customer/login ─────────────────────────────────────────────────

router.post('/login', (req, res) => {
  const { email, password, company_slug } = req.body;
  if (!email || !password || !company_slug) {
    return res.status(400).json({ error: 'email, password, and company_slug are required' });
  }

  const company = db.prepare('SELECT * FROM companies WHERE slug = ?').get(company_slug);
  if (!company || !company.is_active) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE company_id = ? AND email = ?')
    .get(company.id, email.toLowerCase().trim());

  if (!customer || !bcrypt.compareSync(password, customer.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!customer.is_active) {
    return res.status(403).json({ error: 'Your account has been deactivated. Contact the store.' });
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

// ─── All routes below require customer auth ───────────────────────────────────

// GET /api/customer/profile
router.get('/profile', authenticate, requireCustomer, (req, res) => {
  const c = db.prepare('SELECT id, full_name, email, phone, default_shipping_address, created_at FROM customers WHERE id = ?')
    .get(req.user.customerId);
  if (!c) return res.status(404).json({ error: 'Customer not found' });
  res.json(c);
});

// PUT /api/customer/profile
router.put('/profile', authenticate, requireCustomer, (req, res) => {
  const { full_name, phone, default_shipping_address } = req.body;
  db.prepare('UPDATE customers SET full_name = ?, phone = ?, default_shipping_address = ? WHERE id = ?')
    .run(full_name || '', phone || null, default_shipping_address || null, req.user.customerId);
  res.json({ success: true });
});

// PUT /api/customer/profile/password
router.put('/profile/password', authenticate, requireCustomer, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.user.customerId);
  if (!bcrypt.compareSync(current_password, c.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  db.prepare('UPDATE customers SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(new_password, 10), req.user.customerId);
  res.json({ success: true });
});

// ─── Cart ─────────────────────────────────────────────────────────────────────

// GET /api/customer/cart
router.get('/cart', authenticate, requireCustomer, (req, res) => {
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, ci.product_id,
      p.product_name, p.price, p.compare_at_price, p.images, p.category,
      COALESCE(i.quantity, 0) AS stock_quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE ci.customer_id = ? AND ci.company_id = ?
    ORDER BY ci.added_at DESC
  `).all(req.user.customerId, req.user.companyId);
  res.json(items);
});

// POST /api/customer/cart
router.post('/cart', authenticate, requireCustomer, (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ? AND is_published = 1')
    .get(product_id, req.user.companyId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Check stock
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
    db.prepare(`
      INSERT INTO cart_items (company_id, customer_id, product_id, quantity)
      VALUES (?, ?, ?, ?)
    `).run(req.user.companyId, req.user.customerId, product_id, Math.min(parseInt(quantity), stock));
  }

  res.json({ success: true });
});

// PUT /api/customer/cart/:id
router.put('/cart/:id', authenticate, requireCustomer, (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be at least 1' });
  }
  const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND customer_id = ?')
    .get(req.params.id, req.user.customerId);
  if (!item) return res.status(404).json({ error: 'Cart item not found' });

  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(parseInt(quantity), item.id);
  res.json({ success: true });
});

// DELETE /api/customer/cart/:id
router.delete('/cart/:id', authenticate, requireCustomer, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ? AND customer_id = ?')
    .run(req.params.id, req.user.customerId);
  res.json({ success: true });
});

// DELETE /api/customer/cart
router.delete('/cart', authenticate, requireCustomer, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE customer_id = ? AND company_id = ?')
    .run(req.user.customerId, req.user.companyId);
  res.json({ success: true });
});

// POST /api/customer/cart/apply-discount
router.post('/cart/apply-discount', authenticate, requireCustomer, (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });

  const discount = db.prepare(`
    SELECT * FROM discount_codes
    WHERE company_id = ? AND code = ? AND is_active = 1
      AND (max_uses IS NULL OR uses_count < max_uses)
      AND (expires_at IS NULL OR expires_at >= date('now'))
  `).get(req.user.companyId, code.toUpperCase().trim());

  if (!discount) return res.status(404).json({ error: 'Invalid or expired discount code' });
  if (discount.min_order_amount > 0 && (parseFloat(subtotal) || 0) < discount.min_order_amount) {
    return res.status(400).json({
      error: `Minimum order of $${discount.min_order_amount.toFixed(2)} required for this code`,
    });
  }

  let savings = 0;
  if (discount.discount_type === 'percentage') {
    savings = (parseFloat(subtotal) || 0) * (discount.discount_value / 100);
  } else {
    savings = discount.discount_value;
  }

  res.json({
    valid: true,
    discount_id: discount.id,
    discount_type: discount.discount_type,
    discount_value: discount.discount_value,
    savings: Math.min(savings, parseFloat(subtotal) || 0),
    message: discount.discount_type === 'percentage'
      ? `${discount.discount_value}% discount applied!`
      : `$${discount.discount_value.toFixed(2)} discount applied!`,
  });
});

// ─── Orders ───────────────────────────────────────────────────────────────────

// POST /api/customer/orders — place order (checkout)
router.post('/orders', authenticate, requireCustomer, (req, res) => {
  const { shipping_address, payment_method = 'card', discount_id, notes } = req.body;
  if (!shipping_address) return res.status(400).json({ error: 'shipping_address is required' });

  // Get cart items
  const cartItems = db.prepare(`
    SELECT ci.*, p.product_name, p.price, p.inventory_item_id,
      COALESCE(i.quantity, 999) AS stock_quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE ci.customer_id = ? AND ci.company_id = ?
  `).all(req.user.customerId, req.user.companyId);

  if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });

  // Validate stock
  for (const item of cartItems) {
    if (item.stock_quantity < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for "${item.product_name}". Available: ${item.stock_quantity}`,
      });
    }
  }

  // Get store settings
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.companyId);
  if (!company.accept_orders) {
    return res.status(400).json({ error: 'This store is not accepting orders at this time' });
  }

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Apply discount if provided
  let discountSavings = 0;
  if (discount_id) {
    const disc = db.prepare('SELECT * FROM discount_codes WHERE id = ? AND company_id = ? AND is_active = 1')
      .get(discount_id, req.user.companyId);
    if (disc) {
      if (disc.discount_type === 'percentage') {
        discountSavings = subtotal * (disc.discount_value / 100);
      } else {
        discountSavings = Math.min(disc.discount_value, subtotal);
      }
      db.prepare('UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = ?').run(disc.id);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountSavings);
  const shippingAmount = discountedSubtotal >= company.free_shipping_threshold && company.free_shipping_threshold > 0
    ? 0 : company.shipping_fee;
  const taxAmount  = discountedSubtotal * company.tax_rate;
  const total      = discountedSubtotal + shippingAmount + taxAmount;
  const orderNumber = generateOrderNumber();

  db.transaction(() => {
    // Create order
    const orderId = db.prepare(`
      INSERT INTO orders (company_id, customer_id, order_number, status, subtotal, tax_amount,
        shipping_amount, total_amount, shipping_address, payment_method, payment_status, notes, updated_at)
      VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, 'paid', ?, datetime('now'))
    `).run(
      req.user.companyId, req.user.customerId, orderNumber,
      discountedSubtotal, taxAmount, shippingAmount, total,
      JSON.stringify(shipping_address), payment_method,
      notes || null
    ).lastInsertRowid;

    // Insert order items + deduct inventory
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

    // Clear cart
    db.prepare('DELETE FROM cart_items WHERE customer_id = ? AND company_id = ?')
      .run(req.user.customerId, req.user.companyId);
  })();

  res.status(201).json({ success: true, order_number: orderNumber, total });
});

// GET /api/customer/orders
router.get('/orders', authenticate, requireCustomer, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
    FROM orders o
    WHERE o.customer_id = ? AND o.company_id = ?
    ORDER BY o.placed_at DESC
  `).all(req.user.customerId, req.user.companyId);
  res.json(orders);
});

// GET /api/customer/orders/:orderNumber
router.get('/orders/:orderNumber', authenticate, requireCustomer, (req, res) => {
  const order = db.prepare(`
    SELECT * FROM orders WHERE order_number = ? AND customer_id = ? AND company_id = ?
  `).get(req.params.orderNumber, req.user.customerId, req.user.companyId);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

// ─── Wishlist ─────────────────────────────────────────────────────────────────

// GET /api/customer/wishlist
router.get('/wishlist', authenticate, requireCustomer, (req, res) => {
  const items = db.prepare(`
    SELECT wi.id AS wishlist_id, p.*,
      COALESCE(i.quantity, 0) AS stock_quantity
    FROM wishlist_items wi
    JOIN products p ON p.id = wi.product_id
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE wi.customer_id = ?
    ORDER BY wi.added_at DESC
  `).all(req.user.customerId);
  res.json(items);
});

// POST /api/customer/wishlist
router.post('/wishlist', authenticate, requireCustomer, (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  try {
    db.prepare('INSERT INTO wishlist_items (customer_id, product_id) VALUES (?, ?)').run(req.user.customerId, product_id);
  } catch (_) { /* duplicate — already wishlisted */ }
  res.json({ success: true });
});

// DELETE /api/customer/wishlist/:productId
router.delete('/wishlist/:productId', authenticate, requireCustomer, (req, res) => {
  db.prepare('DELETE FROM wishlist_items WHERE customer_id = ? AND product_id = ?')
    .run(req.user.customerId, req.params.productId);
  res.json({ success: true });
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

// POST /api/customer/reviews
router.post('/reviews', authenticate, requireCustomer, (req, res) => {
  const { product_id, rating, review_text } = req.body;
  if (!product_id || !rating) return res.status(400).json({ error: 'product_id and rating are required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });

  // Ensure customer bought this product
  const hasPurchased = db.prepare(`
    SELECT oi.id FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.customer_id = ? AND oi.product_id = ? AND o.payment_status = 'paid'
    LIMIT 1
  `).get(req.user.customerId, product_id);
  if (!hasPurchased) {
    return res.status(403).json({ error: 'You can only review products you have purchased' });
  }

  try {
    db.prepare(`
      INSERT INTO product_reviews (company_id, product_id, customer_id, rating, review_text)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.companyId, product_id, req.user.customerId, parseInt(rating), review_text || null);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
