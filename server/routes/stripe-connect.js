/**
 * Stripe Connect routes for store owner onboarding.
 * All routes require admin authentication.
 */
const express = require('express');
const stripe  = require('../stripe');
const db      = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

function getCompanyId(req) {
  if (req.user.companyId) return req.user.companyId;
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(req.user.id);
  return user?.company_id;
}

// POST /api/stripe/connect/start — create or reuse Express account + return onboarding URL
router.post('/start', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const company   = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    let stripeAccountId = company.stripe_account_id;

    if (!stripeAccountId) {
      // Get admin user's email for account creation
      const adminUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        email: company.store_email || adminUser?.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        default_currency: 'cad',
        metadata: {
          company_id:   String(company.id),
          company_slug: company.slug,
        },
      });

      stripeAccountId = account.id;
      db.prepare(`
        UPDATE companies SET
          stripe_account_id = ?,
          stripe_account_status = 'pending'
        WHERE id = ?
      `).run(stripeAccountId, companyId);
    }

    const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

    const accountLink = await stripe.accountLinks.create({
      account:     stripeAccountId,
      refresh_url: `${BASE_URL}/settings?stripe=refresh`,
      return_url:  `${BASE_URL}/settings?stripe=success`,
      type:        'account_onboarding',
    });

    // Log the session
    try {
      const expiresAt = new Date(accountLink.expires_at * 1000).toISOString();
      db.prepare(`
        INSERT INTO stripe_connect_sessions (company_id, account_link_url, expires_at)
        VALUES (?, ?, ?)
      `).run(companyId, accountLink.url, expiresAt);
    } catch (_) {}

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error('Stripe connect start error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stripe/connect/status — retrieve and sync account status
router.get('/status', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const company   = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    if (!company.stripe_account_id) {
      return res.json({ status: 'not_connected' });
    }

    const account = await stripe.accounts.retrieve(company.stripe_account_id);

    db.prepare(`
      UPDATE companies SET
        stripe_charges_enabled = ?,
        stripe_payouts_enabled = ?,
        stripe_account_status  = ?
      WHERE id = ?
    `).run(
      account.charges_enabled ? 1 : 0,
      account.payouts_enabled ? 1 : 0,
      account.charges_enabled ? 'active' : 'pending',
      companyId
    );

    res.json({
      status:           account.charges_enabled ? 'active' : 'pending',
      charges_enabled:  account.charges_enabled,
      payouts_enabled:  account.payouts_enabled,
      account_id:       account.id,
      details_submitted: account.details_submitted,
    });
  } catch (err) {
    if (err.code === 'account_invalid') {
      // Account was deleted on Stripe side — clear our record
      const companyId = getCompanyId(req);
      db.prepare(`
        UPDATE companies SET
          stripe_account_id = NULL,
          stripe_account_status = 'not_connected',
          stripe_charges_enabled = 0,
          stripe_payouts_enabled = 0
        WHERE id = ?
      `).run(companyId);
      return res.json({ status: 'not_connected' });
    }
    console.error('Stripe status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/connect/disconnect — clear Stripe account linkage
router.post('/disconnect', (req, res) => {
  const companyId = getCompanyId(req);
  db.prepare(`
    UPDATE companies SET
      stripe_account_id      = NULL,
      stripe_account_status  = 'not_connected',
      stripe_charges_enabled = 0,
      stripe_payouts_enabled = 0
    WHERE id = ?
  `).run(companyId);
  res.json({ success: true });
});

// GET /api/stripe/connect/dashboard-link — generate Stripe Express dashboard login link
router.get('/dashboard-link', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const company   = db.prepare('SELECT stripe_account_id FROM companies WHERE id = ?').get(companyId);

    if (!company?.stripe_account_id) {
      return res.status(400).json({ error: 'No Stripe account connected' });
    }

    const loginLink = await stripe.accounts.createLoginLink(company.stripe_account_id);
    res.json({ url: loginLink.url });
  } catch (err) {
    console.error('Dashboard link error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
