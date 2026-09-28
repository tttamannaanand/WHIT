// Thin wrapper around RevenueCat's REST API (v1). Used server-side only —
// the secret key must never reach the mobile app.
//
// Docs: https://www.revenuecat.com/docs/api-v1
require('dotenv').config();
const fetch = require('node-fetch');

const SECRET_KEY = process.env.REVENUECAT_SECRET_API_KEY;
const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || 'premium';
const BASE_URL = 'https://api.revenuecat.com/v1';

/**
 * Fetches a subscriber's current state from RevenueCat and returns whether
 * our configured entitlement is currently active, plus useful metadata.
 *
 * This is the function to call right after a client-side purchase/restore
 * completes (see routes/billing.js POST /billing/sync), so the unlock is
 * confirmed against RevenueCat rather than trusted blindly from the client.
 */
async function fetchEntitlementStatus(appUserId) {
  if (!SECRET_KEY) {
    throw new Error(
      'REVENUECAT_SECRET_API_KEY is not set. Copy .env.example to .env and fill it in.'
    );
  }

  const res = await fetch(`${BASE_URL}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    // RevenueCat creates the subscriber on first SDK call; a 404 here just
    // means this app_user_id has never talked to RevenueCat yet.
    return { isPremium: false, expiresAt: null, productId: null };
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RevenueCat API error ${res.status}: ${text}`);
  }

  const body = await res.json();
  const entitlement = body.subscriber?.entitlements?.[ENTITLEMENT_ID];

  if (!entitlement) {
    return { isPremium: false, expiresAt: null, productId: null };
  }

  const expiresAt = entitlement.expires_date; // null means non-expiring (lifetime)
  const isPremium = expiresAt === null || new Date(expiresAt).getTime() > Date.now();

  return {
    isPremium,
    expiresAt,
    productId: entitlement.product_identifier || null,
  };
}

module.exports = { fetchEntitlementStatus, ENTITLEMENT_ID };
