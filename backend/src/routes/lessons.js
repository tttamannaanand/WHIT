const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { currentDayIndexForUser } = require('../dayIndex');

const router = express.Router();
router.use(requireAuth);

function getUser(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

function lessonSummary(lesson, extra) {
  return {
    id: lesson.id,
    dayIndex: lesson.day_index,
    title: lesson.title,
    category: lesson.category,
    readTime: lesson.read_time,
    thumbnail: lesson.thumbnail,
    ...extra,
  };
}

// GET /lessons/today
// Always accessible to everyone, free or premium — this is the one lesson
// per day that free users get without paying.
router.get('/today', (req, res) => {
  const user = getUser(req.userId);
  const lessonCount = db.prepare('SELECT COUNT(*) AS n FROM lessons').get().n;
  const dayIndex = currentDayIndexForUser(user, lessonCount);

  const lesson = db.prepare('SELECT * FROM lessons WHERE day_index = ?').get(dayIndex);
  if (!lesson) return res.status(404).json({ error: 'No lesson scheduled for today' });

  const completed = db
    .prepare('SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?')
    .get(user.id, lesson.id);

  res.json({
    dayNumber: dayIndex + 1,
    lesson: lessonSummary(lesson, {
      content: lesson.content,
      quizQuestion: lesson.quiz_question,
      answer: lesson.answer,
      xp: lesson.xp,
      completed: !!completed,
    }),
  });
});

// GET /lessons
// Archive list: every lesson up to and including today's, with a `locked`
// flag the client uses to render the lock icon / paywall tap-through.
//
// Gating rule (this is the actual paywall logic, not just UI decoration):
//   - Today's lesson is never locked — free users always get it.
//   - Every other lesson (past lessons, whether completed or not) is
//     locked UNLESS the user currently has an active premium entitlement.
//   - A lesson the user already completed is STILL locked for rereading
//     once its day has passed, if they aren't premium. Free access is
//     "read today's lesson today", not "keep everything you've read".
router.get('/', (req, res) => {
  const user = getUser(req.userId);
  const lessonCount = db.prepare('SELECT COUNT(*) AS n FROM lessons').get().n;
  const dayIndex = currentDayIndexForUser(user, lessonCount);

  const lessons = db
    .prepare('SELECT * FROM lessons WHERE day_index <= ? ORDER BY day_index DESC')
    .all(dayIndex);

  const completedIds = new Set(
    db.prepare('SELECT lesson_id FROM progress WHERE user_id = ?').all(user.id).map((r) => r.lesson_id)
  );

  const items = lessons.map((lesson) => {
    const isToday = lesson.day_index === dayIndex;
    const completed = completedIds.has(lesson.id);
    const locked = !isToday && !user.is_premium;
    return lessonSummary(lesson, { isToday, completed, locked });
  });

  res.json({ dayNumber: dayIndex + 1, lessons: items });
});

// GET /lessons/:id
// Full lesson content (for the reading screen). Enforces the same gating
// rule as the archive list server-side — never trust a client-side lock
// icon alone, since a client can be modified or skip straight to this URL.
router.get('/:id', (req, res) => {
  const user = getUser(req.userId);
  const lessonCount = db.prepare('SELECT COUNT(*) AS n FROM lessons').get().n;
  const dayIndex = currentDayIndexForUser(user, lessonCount);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (lesson.day_index > dayIndex) {
    return res.status(403).json({ error: 'This lesson has not been released yet' });
  }

  const isToday = lesson.day_index === dayIndex;
  if (!isToday && !user.is_premium) {
    return res.status(402).json({
      error: 'Premium required to access past lessons',
      code: 'PAYMENT_REQUIRED',
    });
  }

  const completed = db
    .prepare('SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?')
    .get(user.id, lesson.id);

  res.json(
    lessonSummary(lesson, {
      isToday,
      content: lesson.content,
      quizQuestion: lesson.quiz_question,
      answer: lesson.answer,
      xp: lesson.xp,
      completed: !!completed,
    })
  );
});

// POST /lessons/:id/complete
// Marks a lesson read and awards XP + updates the daily streak. Subject to
// the same access rule as GET /lessons/:id (can't "complete" something
// you're not allowed to read).
router.post('/:id/complete', (req, res) => {
  const user = getUser(req.userId);
  const lessonCount = db.prepare('SELECT COUNT(*) AS n FROM lessons').get().n;
  const dayIndex = currentDayIndexForUser(user, lessonCount);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (lesson.day_index > dayIndex) {
    return res.status(403).json({ error: 'This lesson has not been released yet' });
  }

  const isToday = lesson.day_index === dayIndex;
  if (!isToday && !user.is_premium) {
    return res.status(402).json({ error: 'Premium required', code: 'PAYMENT_REQUIRED' });
  }

  const already = db
    .prepare('SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?')
    .get(user.id, lesson.id);

  if (!already) {
    db.prepare(`
      INSERT INTO progress (user_id, lesson_id, xp_awarded) VALUES (?, ?, ?)
    `).run(user.id, lesson.id, lesson.xp);

    // Streak bump: only today's lesson advances the streak, and only once.
    if (isToday) {
      const newStreak =
        user.last_active_day === dayIndex - 1 || user.last_active_day === null
          ? user.current_streak + 1
          : user.last_active_day === dayIndex
          ? user.current_streak
          : 1; // streak was broken
      const longest = Math.max(newStreak, user.longest_streak);
      db.prepare(`
        UPDATE users SET current_streak = ?, longest_streak = ?, last_active_day = ? WHERE id = ?
      `).run(newStreak, longest, dayIndex, user.id);
    }
  }

  const totalXp = db
    .prepare('SELECT COALESCE(SUM(xp_awarded), 0) AS xp FROM progress WHERE user_id = ?')
    .get(user.id).xp;
  const refreshedUser = getUser(user.id);

  res.json({
    completed: true,
    totalXp,
    currentStreak: refreshedUser.current_streak,
    longestStreak: refreshedUser.longest_streak,
  });
});

module.exports = router;
