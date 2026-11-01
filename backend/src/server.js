require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const lessonsRouter = require('./routes/lessons');
const billingRouter = require('./routes/billing');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in before starting.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/me', usersRouter); // GET/PATCH /me — scoped mount so its auth middleware can't shadow other routers
app.use('/lessons', lessonsRouter);
// billingRouter declares its own full paths (/billing/status, /billing/sync,
// /webhooks/revenuecat) so it's mounted at the root once.
app.use('/', billingRouter);

// 4 args is how Express recognises an error handler, so _next must stay
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4100;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Whit backend listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
