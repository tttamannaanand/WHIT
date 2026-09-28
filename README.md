# Whit — daily micro-learning app

One 5-minute lesson a day. Today's lesson is always free; unlocking the
archive (rereading past lessons, or catching up on ones you missed) requires
a RevenueCat-powered subscription.

Built for RevenueCat's Shipaton hackathon.

```
whit/
├── app/                  Expo / React Native mobile app (TypeScript)
├── backend/               Express + SQLite API (auth, lessons, billing)
└── REVENUECAT_SETUP.md    Step-by-step RevenueCat dashboard walkthrough
```

Read `REVENUECAT_SETUP.md` for the subscription/payment wiring. This file
just gets both halves running locally.

---

## 1. Backend first

```sh
cd backend
cp .env.example .env
# open .env and set at minimum JWT_SECRET (any long random string).
# REVENUECAT_SECRET_API_KEY / REVENUECAT_WEBHOOK_AUTH_HEADER can stay as
# placeholders until you've done the RevenueCat dashboard setup — the app
# and tests still run without them, only real purchase syncing needs them.

npm install
npm run seed     # loads the 30 lessons from data/lessons_source.json into SQLite
npm test         # 11 tests, covers auth, the paywall gating rule, billing sync, webhooks
npm start         # listens on PORT from .env (default 4000)
```

Leave this running — the app talks to it over HTTP.

## 2. Configure the app to find the backend + RevenueCat

Edit `app/app.json` → `expo.extra`:

```json
"extra": {
  "apiBaseUrl": "http://localhost:4000",
  "revenueCatApiKeyIos": "appl_xxxx...",
  "revenueCatApiKeyAndroid": "goog_xxxx..."
}
```

- `apiBaseUrl`: if you're running the app on a physical device (not a
  simulator), `localhost` won't reach your laptop — use your machine's LAN
  IP instead (e.g. `http://192.168.1.23:4000`).
- The two RevenueCat keys are **public** SDK keys (safe in the app). Get
  them from RevenueCat once you've done step 4 of `REVENUECAT_SETUP.md`.
  Leaving them as placeholders is fine — `purchases.ts` detects the
  placeholder and just skips configuring the SDK, so the rest of the app
  still runs.

## 3. Run the app

```sh
cd app
npm install
npx tsc --noEmit   # sanity check, should be clean
npx expo start
```

Scan the QR code with Expo Go for everything **except** real purchases —
`react-native-purchases` is a native module, so testing an actual
subscription purchase needs an EAS development build (see step 7 of
`REVENUECAT_SETUP.md`).

## 4. Try the flow

1. Sign up (creates an account, day 0 of the lesson schedule starts now).
2. Home shows today's lesson — free for everyone, always.
3. Finish it, take the quiz, check the Archive tab.
4. To see the paywall: either wait a day, or fast-forward a test account by
   backdating its `created_at` in SQLite —
   ```sh
   sqlite3 backend/data/whit.db \
     "UPDATE users SET created_at = datetime('now', '-3 day') WHERE email = 'you@example.com';"
   ```
   Reload the app — the archive now has 3 unlocked days of history and
   locked entries beyond that, exactly like a real user who skipped days.
5. Tap a locked lesson → routed to the Paywall screen → subscribe (sandbox
   purchase, once RevenueCat + EAS build are set up) → archive unlocks.

## What's already wired up vs. what's dashboard config

Everything in `app/` and `backend/` is done: auth, the "only today is free"
gating rule (server-enforced, not just hidden in the UI), the paywall
screen, purchase + restore flows, and the dual-path entitlement sync
(instant `/billing/sync` call + durable webhook). What's left is account
setup on RevenueCat's dashboard and the app stores — that's the whole of
`REVENUECAT_SETUP.md`.
