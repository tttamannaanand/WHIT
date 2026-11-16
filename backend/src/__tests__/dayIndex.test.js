'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { currentDayIndexForUser } = require('../dayIndex');

const user = { created_at: '2026-03-10 23:59:00' }; // SQLite datetime('now') format, UTC

test('signup day is day 0, even late in the evening', () => {
  assert.equal(currentDayIndexForUser(user, 30, new Date('2026-03-10T23:59:59Z')), 0);
});

test('rolls over at UTC midnight, not after 24 hours', () => {
  assert.equal(currentDayIndexForUser(user, 30, new Date('2026-03-11T00:00:00Z')), 1);
});

test('counts whole calendar days across month boundaries', () => {
  assert.equal(currentDayIndexForUser(user, 30, new Date('2026-04-01T12:00:00Z')), 22);
});

test('clamps to the last lesson once the course is finished', () => {
  assert.equal(currentDayIndexForUser(user, 30, new Date('2027-03-10T00:00:00Z')), 29);
});

test('never goes negative if the clock is before signup', () => {
  assert.equal(currentDayIndexForUser(user, 30, new Date('2026-03-01T00:00:00Z')), 0);
});
