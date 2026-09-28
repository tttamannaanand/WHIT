// End-to-end tests against the real Express app + a throwaway SQLite file,
// run with Node's built-in test runner (no extra deps): `npm test`.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Point the app at a scratch DB before anything requires ./db.
const tmpDb = path.join(os.tmpdir(), `whit-test-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = 'test-webhook-secret';
process.env.REVENUECAT_SECRET_API_KEY = 'sk_test_unused_because_fetch_is_mocked';
process.env.REVENUECAT_ENTITLEMENT_ID = 'premium';

const db = require('../db');
const seed = require('../seed');
const app = require('../server');
const revenuecat = require('../revenuecat');

seed();

// Minimal request helper (avoids adding supertest as a dependency): starts
// the app on an ephemeral port for the duration of the test file.
let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
  fs.rmSync(tmpDb, { force: true });
  fs.rmSync(tmpDb + '-wal', { force: true });
  fs.rmSync(tmpDb + '-shm', { force: true });
});

async function api(method, urlPath, { token, body } = {}) {
  const res = await fetch(baseUrl + urlPath, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

function randomEmail() {
  return `test-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUp() {
  const email = randomEmail();
  const res = await api('POST', '/auth/signup', {
    body: { email, password: 'password123', name: 'Jordan Lee' },
  });
  assert.equal(res.status, 201);
  return res.body; // { token, user }
}

test('signup rejects a short password', async () => {
  const res = await api('POST', '/auth/signup', {
    body: { email: randomEmail(), password: 'short', name: 'A' },
  });
  assert.equal(res.status, 400);
});

test('signup then login round-trip', async () => {
  const email = randomEmail();
  const signupRes = await api('POST', '/auth/signup', {
    body: { email, password: 'password123', name: 'Jordan Lee' },
  });
  assert.equal(signupRes.status, 201);
  assert.equal(signupRes.body.user.isPremium, false);

  const loginRes = await api('POST', '/auth/login', {
    body: { email, password: 'password123' },
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.user.email, email.toLowerCase());
});

test('login fails with wrong password', async () => {
  const { user } = await signUp();
  const res = await api('POST', '/auth/login', {
    body: { email: user.email, password: 'wrong-password' },
  });
  assert.equal(res.status, 401);
});

test('protected routes 401 without a token', async () => {
  const res = await api('GET', '/lessons/today');
  assert.equal(res.status, 401);
});

test("a fresh free user can read today's lesson (day 0) in full", async () => {
  const { token } = await signUp();
  const res = await api('GET', '/lessons/today', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.dayNumber, 1);
  assert.ok(res.body.lesson.content.length > 100, 'full content should be returned');
});

test('a free user cannot read a lesson from a future day', async () => {
  const { token } = await signUp();
  // day_index 5 (the 6th lesson) hasn't been "released" to a brand new user yet.
  const future = db.prepare('SELECT id FROM lessons WHERE day_index = 5').get();
  const res = await api('GET', `/lessons/${future.id}`, { token });
  assert.equal(res.status, 403);
});

test('a free user is blocked (402) from a past lesson, even one they completed today', async () => {
  const { token, user } = await signUp();

  // Complete today's lesson (day 0) — allowed for free users.
  const today = db.prepare('SELECT * FROM lessons WHERE day_index = 0').get();
  const completeRes = await api('POST', `/lessons/${today.id}/complete`, { token });
  assert.equal(completeRes.status, 200);

  // Simulate the next day passing by moving the user's created_at back one day.
  db.prepare("UPDATE users SET created_at = datetime('now', '-1 day') WHERE id = ?").run(user.id);

  // Yesterday's lesson (the one they completed) is now a *past* lesson —
  // rereading it should require premium, per the paywall rule.
  const rereadRes = await api('GET', `/lessons/${today.id}`, { token });
  assert.equal(rereadRes.status, 402);
  assert.equal(rereadRes.body.code, 'PAYMENT_REQUIRED');

  // The archive list should also mark it locked.
  const archiveRes = await api('GET', '/lessons', { token });
  const entry = archiveRes.body.lessons.find((l) => l.id === today.id);
  assert.equal(entry.locked, true);
  assert.equal(entry.completed, true); // still shows as completed, just locked for reread
});

test('billing/sync marks a user premium based on RevenueCat and unlocks past lessons', async (t) => {
  const { token, user } = await signUp();

  const today = db.prepare('SELECT * FROM lessons WHERE day_index = 0').get();
  await api('POST', `/lessons/${today.id}/complete`, { token });
  db.prepare("UPDATE users SET created_at = datetime('now', '-1 day') WHERE id = ?").run(user.id);

  // Confirm it's locked before "purchasing".
  const before = await api('GET', `/lessons/${today.id}`, { token });
  assert.equal(before.status, 402);

  // Mock RevenueCat's REST response as if a purchase just completed.
  t.mock.method(revenuecat, 'fetchEntitlementStatus', async () => ({
    isPremium: true,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    productId: 'whit_premium_monthly',
  }));

  const syncRes = await api('POST', '/billing/sync', { token });
  assert.equal(syncRes.status, 200);
  assert.equal(syncRes.body.isPremium, true);

  const after = await api('GET', `/lessons/${today.id}`, { token });
  assert.equal(after.status, 200, 'past lesson should now be readable after sync marks premium');

  const statusRes = await api('GET', '/billing/status', { token });
  assert.equal(statusRes.body.isPremium, true);
});

test('the RevenueCat webhook rejects requests with a bad or missing auth header', async () => {
  const res = await api('POST', '/webhooks/revenuecat', {
    body: { event: { type: 'INITIAL_PURCHASE', app_user_id: 'whoever' } },
  });
  assert.equal(res.status, 401);
});

test('the RevenueCat webhook re-syncs entitlement for the affected user', async (t) => {
  const { token, user } = await signUp();

  t.mock.method(revenuecat, 'fetchEntitlementStatus', async () => ({
    isPremium: true,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    productId: 'whit_premium_annual',
  }));

  const res = await fetch(baseUrl + '/webhooks/revenuecat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'test-webhook-secret',
    },
    body: JSON.stringify({
      event: {
        id: 'evt_test_1',
        type: 'INITIAL_PURCHASE',
        app_user_id: user.id,
        product_id: 'whit_premium_annual',
      },
    }),
  });
  assert.equal(res.status, 200);

  // Webhook handler updates the DB asynchronously after responding; poll briefly.
  let updated;
  for (let i = 0; i < 20; i++) {
    updated = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(user.id);
    if (updated.is_premium) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.equal(updated.is_premium, 1);

  const statusRes = await api('GET', '/billing/status', { token });
  assert.equal(statusRes.body.isPremium, true);
});

test('profile edit (PATCH /me) updates name and rejects a taken username', async () => {
  const a = await signUp();
  const b = await signUp();

  const renamed = await api('PATCH', '/me', { token: a.token, body: { name: 'New Name' } });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, 'New Name');

  const clash = await api('PATCH', '/me', { token: a.token, body: { username: b.user.username } });
  assert.equal(clash.status, 409);
});
