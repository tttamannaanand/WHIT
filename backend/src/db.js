const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'whit.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar_initial TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Cached entitlement state. This is a read cache for fast gating checks;
  -- the source of truth is RevenueCat, kept in sync via webhook events and
  -- the /billing/sync endpoint (see routes/billing.js).
  is_premium INTEGER NOT NULL DEFAULT 0,
  premium_expires_at TEXT,
  premium_product_id TEXT,
  premium_updated_at TEXT,

  -- Streak tracking
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_day INTEGER
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  day_index INTEGER NOT NULL UNIQUE, -- 0-based; day_index 0 is everyone's day 1
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  read_time TEXT NOT NULL,
  thumbnail TEXT,
  content TEXT NOT NULL,
  quiz_question TEXT NOT NULL,
  answer TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, lesson_id)
);

-- Raw log of every webhook RevenueCat sends us, for debugging/audit.
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  app_user_id TEXT,
  event_type TEXT,
  payload TEXT NOT NULL
);
`);

module.exports = db;
