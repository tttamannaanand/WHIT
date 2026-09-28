const express = require('express');
const db = require('../db');
const crypto = require('crypto');
const { requireAuth } = require('../auth');
const revenuecat = require('../revenuecat');

const router = express.Router();

function applyEntitlementToUser(userId, status) {
  db.prepare(`
    UPDATE users
    SET is_premium = ?, premium_expires_at = ?, premium_product_id = ?, premium_updated_at = datetime('now')
    WHERE id = ?
  `).run(status.isPremium ? 1 : 0, status.expiresAt, status.productId, userId);
}

// GET /billing/status
// Fast, DB-only read of the cached entitlement — call this on app launch.
// It reflects whatever the last webhook or /billing/sync call set, which
// in normal operation is at most a few seconds stale.
router.get('/billing/status', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({
    isPremium: !!user.is_premium,
    expiresAt: user.premium_expires_at,
    productId: user.premium_product_id,
    updatedAt: user.premium_updated_at,
  });
});

// POST /billing/sync
// Call this immediately after Purchases.purchasePackage(...) or
// Purchases.restorePurchases(...) resolves on the client. It asks
// RevenueCat directly (not the client's local CustomerInfo) so the unlock
// the user sees is confirmed server-side, not just trusted from the app —
// this is what makes "only after payment can you access more lessons" an
// actual server-enforced rule rather than a client-side toggle.
router.post('/billing/sync', requireAuth, async (req, res) => {
  try {
    const status = await revenuecat.fetchEntitlementStatus(req.userId);
    applyEntitlementToUser(req.userId, status);
    res.json(status);
  } catch (err) {
    console.error('billing/sync failed:', err.message);
    res.status(502).json({ error: 'Could not reach RevenueCat. Try again in a moment.' });
  }
});

// POST /webhooks/revenuecat
// Configured in the RevenueCat dashboard under Project settings >
// Integrations > Webhooks. This is the async source of truth: it fires on
// every entitlement-affecting event (purchase, renewal, cancellation,
// expiration, billing issue, refund, ...) even if the user never reopens
// the app, so subscriptions that lapse get revoked here without the app
// having to be running.
//
// Auth: RevenueCat sends whatever string you configured as the
// "Authorization header" value on the webhook, on every request. We just
// compare it. For stronger verification, switch to HMAC signature
// checking (X-RevenueCat-Webhook-Signature) — see the walkthrough doc.
router.post('/webhooks/revenuecat', async (req, res) => {
  const configuredAuth = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
  const receivedAuth = req.headers.authorization;

  if (!configuredAuth || receivedAuth !== configuredAuth) {
    return res.status(401).json({ error: 'Invalid webhook authorization' });
  }

  const event = req.body?.event;
  if (!event) {
    return res.status(400).json({ error: 'Missing event in payload' });
  }

  db.prepare(`
    INSERT INTO webhook_events (id, app_user_id, event_type, payload)
    VALUES (?, ?, ?, ?)
  `).run(
    event.id || crypto.randomUUID(),
    event.app_user_id || null,
    event.type || null,
    JSON.stringify(req.body)
  );

  // Always acknowledge fast; RevenueCat retries on non-2xx and on timeout.
  res.status(200).json({ received: true });

  // Re-fetch authoritative state from RevenueCat rather than trying to
  // hand-parse every event type's meaning (RevenueCat's own recommendation
  // — event shapes evolve, GET /subscribers is always current).
  const appUserId = event.app_user_id;
  if (!appUserId) return;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(appUserId);
  if (!user) return; // e.g. a test event, or a user_id from before this backend existed

  try {
    const status = await revenuecat.fetchEntitlementStatus(appUserId);
    applyEntitlementToUser(appUserId, status);
  } catch (err) {
    console.error(`Failed to sync entitlement for ${appUserId} after webhook:`, err.message);
  }
});

module.exports = router;
