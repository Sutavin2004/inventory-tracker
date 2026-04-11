/**
 * Stripe webhook handler.
 * CRITICAL: This router must be mounted BEFORE express.json() in index.js
 * because Stripe webhook verification requires the raw request body.
 */
const express = require('express');
const stripe  = require('../stripe');
const db      = require('../db');

const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_REPLACE')) {
    // Webhook secret not configured — silently accept (dev mode)
    return res.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Primary order creation is handled by /payment/confirm endpoint.
        // Webhook is a backup — only acts if order hasn't been created yet.
        break;

      case 'payment_intent.payment_failed': {
        const failedPI = event.data.object;
        db.prepare(`
          UPDATE orders SET payment_status = 'failed', status = 'cancelled', updated_at = datetime('now')
          WHERE stripe_payment_intent_id = ?
        `).run(failedPI.id);
        break;
      }

      case 'account.updated': {
        const account = event.data.object;
        db.prepare(`
          UPDATE companies SET
            stripe_charges_enabled = ?,
            stripe_payouts_enabled = ?,
            stripe_account_status = ?
          WHERE stripe_account_id = ?
        `).run(
          account.charges_enabled ? 1 : 0,
          account.payouts_enabled ? 1 : 0,
          account.charges_enabled ? 'active' : 'pending',
          account.id
        );
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        db.prepare(`
          UPDATE orders SET
            payment_status = 'refunded',
            refunded_at = datetime('now'),
            updated_at = datetime('now')
          WHERE stripe_charge_id = ?
        `).run(charge.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err.message);
  }

  res.json({ received: true });
});

module.exports = router;
