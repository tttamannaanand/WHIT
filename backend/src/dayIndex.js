// Which lesson "day" a user is on: whole days elapsed since their signup
// date (UTC calendar days), clamped to the number of lessons available.
// Day 0 = signup day = their first lesson.
function currentDayIndexForUser(user, lessonCount, now = new Date()) {
  const created = new Date(user.created_at + 'Z'); // SQLite datetime('now') is UTC, no offset suffix
  const createdMidnight = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
  const nowMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysElapsed = Math.floor((nowMidnight - createdMidnight) / 86400000);
  const dayIndex = Math.max(0, daysElapsed);
  return Math.min(dayIndex, lessonCount - 1);
}

module.exports = { currentDayIndexForUser };
