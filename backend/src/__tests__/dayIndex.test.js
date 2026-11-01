const test = require('node:test');
const assert = require('node:assert/strict');
const { currentDayIndexForUser } = require('../dayIndex');

const user = { created_at: '2026-03-10 23:30:00' }; // SQLite UTC, no suffix
const at = (iso) => new Date(iso);

test('signup day is day 0', () => {
  assert.equal(currentDayIndexForUser(user, 30, at('2026-03-10T23:59:59Z')), 0);
});

test('day ticks over at UTC midnight, not 24h after signup', () => {
  assert.equal(currentDayIndexForUser(user, 30, at('2026-03-11T00:00:01Z')), 1);
});

test('counts whole calendar days across a month boundary', () => {
  assert.equal(currentDayIndexForUser(user, 30, at('2026-04-02T12:00:00Z')), 23);
});

test('clamps to the last lesson once the course runs out', () => {
  assert.equal(currentDayIndexForUser(user, 30, at('2027-01-01T00:00:00Z')), 29);
});

test('never goes negative if the clock is behind signup', () => {
  assert.equal(currentDayIndexForUser(user, 30, at('2026-03-09T12:00:00Z')), 0);
});
