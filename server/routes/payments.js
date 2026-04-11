/**
 * Customer payment routes (Stripe).
 * Mounted at /api/store so full paths are:
 *   POST /api/store/:slug/payment/create-intent
 *   POST /api/store/:slug/payment/confirm
 */
const express = require('express');
const jwt     = require('jsonwebtoken');
const stripe  = require('../stripe');
const db      = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ─── Middleware: customer auth + slug/company match ────────────────────────────

function requireSlugCustomerAuth(req, res, next) {
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

// ─── Stripe processing fee calculation ────────────────────────────────────────
// Passes the fee to the customer so the store receives the full subtotal.
// Formula: total = (baseAmount + 0.30) / (1 - 0.029)

function calculateStripeFee(baseAmount) {
  const total = (baseAmount + 0.30) / (1 - 0.029);
  const fee   = total - baseAmount;
  return {
    fee:   Math.round(fee   * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ─── POST /api/store/:slug/payment/create-intent ─────────────────────────────

router.post('/:slug/payment/create-intent', requireSlugCustomerAuth, async (req, res) => {
  const company = req.company;

  if (!company.stripe_account_id || !company.stripe_charges_enabled) {
    return res.status(400).json({ error: 'This store is not set up to accept payments yet' });
  }

  const { subtotal, tax, shipping, discount = 0 } = req.body;
  if (subtotal === undefined || tax === undefined || shipping === undefined) {
    return res.status(400).json({ error: 'subtotal, tax, and shipping are required' });
  }

  const baseAmount    = Math.round((parseFloat(subtotal) - parseFloat(discount) + parseFloat(shipping) + parseFloat(tax)) * 100) / 100;
  const { fee, total } = calculateStripeFee(baseAmount);
  const amountInCents  = Math.round(total * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountInCents,
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      transfer_data: { destination: company.stripe_account_id },
      metadata: {
        company_id:     String(company.id),
        company_slug:   req.params.slug,
        customer_id:    String(req.user.customerId),
        subtotal:       String(subtotal),
        tax:            String(tax),
        shipping:       String(shipping),
        discount:       String(discount),
        processing_fee: String(fee),
      },
    });

    res.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      processingFee:   fee,
      total,
      currency: 'CAD',
    });
  } catch (err) {
    console.error('Create payment intent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/store/:slug/payment/confirm ────────────────────────────────────

router.post('/:slug/payment/confirm', requireSlugCustomerAuth, async (req, res) => {
  const { paymentIntentId, shippingAddress } = req.body;
  if (!paymentIntentId || !shippingAddress) {
    return res.status(400).json({ error: 'paymentIntentId and shippingAddress are required' });
  }

  // Verify payment with Stripe
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid payment intent' });
  }

  if (paymentIntent.status !== 'succeeded') {
    return res.status(400).json({ error: `Payment not completed. Status: ${paymentIntent.status}` });
  }

  // Idempotency: if order already exists for this payment intent, return it
  const existing = db.prepare('SELECT order_number FROM orders WHERE stripe_payment_intent_id = ?').get(paymentIntentId);
  if (existing) {
    return res.json({ success: true, orderNumber: existing.order_number });
  }

  // Verify the payment intent belongs to this company
  if (paymentIntent.metadata?.company_id !== String(req.company.id)) {
    return res.status(403).json({ error: 'Payment intent does not belong to this store' });
  }

  // Look up cart items from DB (never trust client for items)
  const cartItems = db.prepare(`
    SELECT ci.*, p.product_name, p.price, p.inventory_item_id,
      COALESCE(i.quantity, 999) AS stock_quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN inventory i ON i.item_id = p.inventory_item_id
    WHERE ci.customer_id = ? AND ci.company_id = ?
  `).all(req.user.customerId, req.user.companyId);

  if (!cartItems.length) {
    return res.status(400).json({ error: 'Cart is empty — order may have already been placed' });
  }

  const meta           = paymentIntent.metadata;
  const total          = paymentIntent.amount / 100;
  const processingFee  = parseFloat(meta.processing_fee || 0);
  const orderNumber    = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const shippingAddr   = typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress);

  try {
    db.transaction(() => {
      const orderId = db.prepare(`
        INSERT INTO orders (
          company_id, customer_id, order_number, status,
          subtotal, tax_amount, shipping_amount, discount_amount,
          processing_fee, total_amount, shipping_address,
          payment_method, payment_status,
          stripe_payment_intent_id, amount_paid, currency, updated_at
        ) VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, 'stripe', 'paid', ?, ?, 'CAD', datetime('now'))
      `).run(
        req.user.companyId,
        req.user.customerId,
        orderNumber,
        parseFloat(meta.subtotal    || 0),
        parseFloat(meta.tax         || 0),
        parseFloat(meta.shipping    || 0),
        parseFloat(meta.discount    || 0),
        processingFee,
        total,
        shippingAddr,
        paymentIntentId,
        total,
      ).lastInsertRowid;

      for (const item of cartItems) {
        db.prepare(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(orderId, item.product_id, item.product_name, item.quantity, item.price, item.quantity * item.price);

        if (item.inventory_item_id) {
          db.prepare(`
            UPDATE inventory SET quantity = quantity - ?, last_updated = datetime('now')
            WHERE item_id = ?
          `).run(item.quantity, item.inventory_item_id);
        }

        // Audit log entry
        try {
          db.prepare(`
            INSERT INTO audit_log (company_id, action, item_id, item_name, change_amount, performed_by, notes, timestamp)
            VALUES (?, 'PURCHASE', ?, ?, ?, ?, ?, datetime('now'))
          `).run(
            req.user.companyId,
            item.inventory_item_id,
            item.product_name,
            -item.quantity,
            `customer:${req.user.customerId}`,
            `Order ${orderNumber}`,
          );
        } catch (_) {}
      }

      // Clear cart
      db.prepare('DELETE FROM cart_items WHERE customer_id = ? AND company_id = ?')
        .run(req.user.customerId, req.user.companyId);
    })();

    res.status(201).json({ success: true, orderNumber });
  } catch (err) {
    console.error('Order creation error:', err.message);
    res.status(500).json({ error: 'Failed to create order: ' + err.message });
  }
});

module.exports = router;
