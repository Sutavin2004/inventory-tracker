# Setting up Stripe Webhooks

## Local development

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to your Stripe account:
   ```bash
   stripe login
   ```

3. Forward events to your local server:
   ```bash
   stripe listen --forward-to localhost:5001/api/stripe/webhook
   ```

4. Copy the webhook signing secret shown in the terminal output (starts with `whsec_`)

5. Add it to `server/.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
   ```

6. Restart the server — the webhook signature will now be verified.

---

## Production (Railway)

1. Go to [stripe.com/dashboard](https://stripe.com/dashboard)
2. Click **Developers → Webhooks**
3. Click **Add endpoint**
4. Set the endpoint URL to:
   ```
   https://edepot.ca/api/stripe/webhook
   ```
5. Select these events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `charge.refunded`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Go to Railway → your service → **Variables**
9. Add: `STRIPE_WEBHOOK_SECRET = whsec_your_signing_secret`
10. Redeploy

---

## Test cards (development only)

| Scenario           | Card number          |
|--------------------|----------------------|
| Success            | 4242 4242 4242 4242  |
| Decline            | 4000 0000 0000 0002  |
| Auth required      | 4000 0025 0000 3155  |

- **Expiry**: any future date (e.g. 12/28)
- **CVV**: any 3 digits (e.g. 123)
- **Postal code**: any value (e.g. M5V1A1)

---

## Stripe Connect onboarding flow

1. Store admin goes to **Settings → Payments**
2. Clicks **Connect Stripe Account**
3. E-Depot creates a Stripe Express account and redirects to Stripe's onboarding
4. Store owner completes their bank details and ID verification on Stripe
5. Stripe redirects back to `/settings?stripe=success`
6. The Settings page automatically refreshes the account status
7. Once `charges_enabled = true`, the store accepts live payments

---

## Fee structure (CAD)

Stripe charges: **2.9% + $0.30 per transaction**

E-Depot passes this fee on to the customer at checkout.

Formula: `customer_total = (store_subtotal + 0.30) / (1 - 0.029)`

This ensures the store owner always receives the full product amount.
