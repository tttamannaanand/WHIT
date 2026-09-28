// Loads data/lessons_source.json (the 30-lesson dataset the user supplied)
// into the lessons table, one row per lesson, in file order. File order
// becomes day_index, which is what /lessons/today uses to figure out which
// lesson a given user is "on" (see routes/lessons.js).
//
// Safe to re-run: it replaces the lessons table contents each time, but
// never touches users or progress.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const SOURCE_PATH = path.join(__dirname, '..', 'data', 'lessons_source.json');

function seed() {
  const raw = fs.readFileSync(SOURCE_PATH, 'utf8');
  const lessons = JSON.parse(raw);

  if (!Array.isArray(lessons) || lessons.length === 0) {
    throw new Error(`No lessons found in ${SOURCE_PATH}`);
  }

  const insert = db.prepare(`
    INSERT INTO lessons (id, day_index, title, category, read_time, thumbnail, content, quiz_question, answer, xp)
    VALUES (@id, @day_index, @title, @category, @read_time, @thumbnail, @content, @quiz_question, @answer, @xp)
  `);

  const clear = db.prepare('DELETE FROM lessons');

  const run = db.transaction((rows) => {
    clear.run();
    rows.forEach((lesson, index) => {
      insert.run({
        id: crypto.createHash('sha1').update(lesson.title).digest('hex').slice(0, 12),
        day_index: index,
        title: lesson.title,
        category: lesson.category,
        read_time: lesson.read_time,
        thumbnail: lesson.thumbnail || null,
        content: lesson.content,
        quiz_question: lesson.quiz_question,
        answer: lesson.answer,
        xp: lesson.xp || 50,
      });
    });
  });

  run(lessons);
  console.log(`Seeded ${lessons.length} lessons (day_index 0..${lessons.length - 1}).`);
}

if (require.main === module) {
  seed();
}

module.exports = seed;
