const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign } = require('../auth');

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.username,
    avatarInitial: row.avatar_initial,
    isPremium: !!row.is_premium,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    createdAt: row.created_at,
  };
}

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const username = email.split('@')[0].toLowerCase() + '-' + id.slice(0, 4);
  const avatarInitial = name.trim().charAt(0).toUpperCase() || 'W';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, username, avatar_initial)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase(), passwordHash, name, username, avatarInitial);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  // IMPORTANT: this same `id` must be passed to Purchases.logIn(id) on the
  // client right after signup, so RevenueCat's app_user_id matches our
  // user id and webhook events land on the right account. See the mobile
  // app's src/lib/purchases.ts and the walkthrough doc, step 5.
  return res.status(201).json({ token: sign(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({ token: sign(user), user: publicUser(user) });
});

module.exports = { router, publicUser };
