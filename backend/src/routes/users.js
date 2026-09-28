const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { publicUser } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// Mounted at /me in server.js (not at '/'), so this router's requireAuth
// middleware only ever runs for /me requests — never shadows other routers.
router.get('/', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const lessonsCompleted = db
    .prepare('SELECT COUNT(*) AS n FROM progress WHERE user_id = ?')
    .get(user.id).n;
  const totalXp = db
    .prepare('SELECT COALESCE(SUM(xp_awarded), 0) AS xp FROM progress WHERE user_id = ?')
    .get(user.id).xp;

  res.json({ ...publicUser(user), lessonsCompleted, totalXp });
});

// PATCH /me — edit-profile screen. Only name/username are user-editable;
// email changes and premium status are intentionally not editable here.
router.patch('/', (req, res) => {
  const { name, username } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username !== user.username) {
    const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, user.id);
    if (taken) return res.status(409).json({ error: 'That username is taken' });
  }

  const nextName = name?.trim() || user.name;
  const nextUsername = username?.trim() || user.username;
  const nextAvatar = nextName.charAt(0).toUpperCase() || user.avatar_initial;

  db.prepare('UPDATE users SET name = ?, username = ?, avatar_initial = ? WHERE id = ?').run(
    nextName,
    nextUsername,
    nextAvatar,
    user.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json(publicUser(updated));
});

module.exports = router;
