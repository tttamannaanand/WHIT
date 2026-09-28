# Connecting RevenueCat — step by step

This walks through everything needed to go from "the app is built" to "a real
subscription purchase unlocks the archive." The code side is already done
(see `app/src/lib/purchases.ts` and `backend/src/routes/billing.js`) — this
doc is the dashboard/account side.

Rough time: 45–90 minutes the first time, mostly waiting on App Store
Connect / Play Console approval screens.

---

## 0. What you're connecting, in one picture

```
 Mobile app                RevenueCat                 Your backend
 (react-native-purchases)  (app.revenuecat.com)        (Express API)

 Purchases.configure() ──► reads your public SDK key
 Purchases.logIn(userId) ─► ties RC's "app_user_id" to YOUR user id
 purchasePackage() ───────► runs the native App Store / Play purchase sheet
                             │
                             ▼
                          RevenueCat validates the receipt
                          with Apple/Google, activates the
                          "premium" entitlement
                             │
              ┌──────────────┴───────────────┐
              ▼                               ▼
      app calls POST /billing/sync    RevenueCat sends a
      (instant, in the same tap)      webhook to your server
              │                               │
              ▼                               ▼
      backend calls RevenueCat's REST API to double check → updates
      users.is_premium in the database → archive unlocks
```

Two paths update your database on purpose: `/billing/sync` is instant
(called right after the purchase sheet closes, so the app doesn't sit on a
stale "still locked" screen), and the webhook is the durable one that keeps
working even if the app is closed later — e.g. when a subscription expires
or a refund happens.

---

## 1. Create the RevenueCat project

1. Sign up at [app.revenuecat.com](https://app.revenuecat.com) (free tier is
   plenty for a hackathon).
2. Create a new **Project** — call it "Whit".
3. Inside the project, add an **App** for each store you're shipping to:
   - iOS app: you'll need your app's **Bundle ID** (e.g. `com.yourcompany.whit`,
     matching `app.json` → `expo.ios.bundleIdentifier`).
   - Android app: you'll need your **Package name** (matching
     `app.json` → `expo.android.package`) and, later, a Play Console service
     account JSON key so RevenueCat can validate purchases server-side.

RevenueCat's own setup screens link out to exactly where to find each of
these in App Store Connect / Play Console — follow those links when you hit
them, the fields change occasionally.

---

## 2. Create the actual subscription products

This part happens in **App Store Connect** and **Google Play Console**, not
in RevenueCat — RevenueCat reads products you've already created there.

1. In App Store Connect → your app → **Subscriptions**, create a
   Subscription Group (e.g. "Whit Premium") with two products:
   - `whit_premium_monthly`
   - `whit_premium_annual`
   Give the annual one a **7-day free trial** as an introductory offer —
   that satisfies the Shipaton rule that judges must be able to unlock
   premium for free (a free trial counts; you don't need a separate promo
   code if you do this).
2. In Google Play Console → your app → **Monetize → Products →
   Subscriptions**, create matching products with the same identifiers.
3. Products can take a few hours to finish processing on Apple's side the
   first time — start this step early.

---

## 3. Entitlements, products, and the Offering

Back in RevenueCat:

1. **Entitlements** → create one called `premium`. This is the identifier
   the backend already expects — `backend/.env`'s
   `REVENUECAT_ENTITLEMENT_ID` defaults to `premium`, matching
   `revenuecat.js`.
2. **Products** → attach both store products (`whit_premium_monthly`,
   `whit_premium_annual`) to the `premium` entitlement.
3. **Offerings** → create (or use the default) Offering, and add both
   products as **Packages** inside it — a `$rc_monthly` package and a
   `$rc_annual` package. This is what `PaywallScreen.tsx` renders: it calls
   `Purchases.getOfferings()` and lists whatever packages are in your
   *current* offering, so the price cards on the paywall screen will show
   real prices automatically once this step is done — nothing to change in
   the app code.

---

## 4. Get your API keys

RevenueCat gives you two very different kinds of keys — mixing them up is
the most common integration mistake.

- **Public SDK keys** (one per platform, look like `appl_...` / `goog_...`):
  Project settings → API keys. These go in the **mobile app only**:

  ```json
  // app/app.json
  "extra": {
    "revenueCatApiKeyIos": "appl_xxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "revenueCatApiKeyAndroid": "goog_xxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
  ```

  `app/src/lib/purchases.ts` reads these and calls `Purchases.configure()`
  with the right one for the current platform.

- **Secret API key** (looks like `sk_...`): same API keys page, but a
  separate "Secret" section. This goes in the **backend only**, never in
  the app:

  ```
  # backend/.env
  REVENUECAT_SECRET_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

  `backend/src/revenuecat.js` uses it to call RevenueCat's REST API and ask
  "is this user actually premium right now" — that's the call
  `/billing/sync` and the webhook handler both make.

---

## 5. Wire the webhook to your backend

1. Deploy the backend somewhere with a public HTTPS URL (Render, Railway,
   Fly.io, a VPS — anything). `backend/src/server.js` needs no changes to
   deploy; just set the env vars from `.env.example` on whatever host you
   pick.
2. In RevenueCat: **Project settings → Integrations → Webhooks → Add**.
   - URL: `https://your-backend.example.com/webhooks/revenuecat`
   - Authorization header: generate a random string
     (`openssl rand -hex 32` works) and paste it in. Put the **same** string
     in the backend's `.env`:
     ```
     REVENUECAT_WEBHOOK_AUTH_HEADER=<the same random string>
     ```
     `backend/src/routes/billing.js` rejects any webhook call whose
     `Authorization` header doesn't match this exactly — that's what stops
     someone else from POSTing fake "user is premium" events at your API.
3. Save, then use RevenueCat's "Send test event" button and check your
   backend logs / the `webhook_events` table
   (`sqlite3 backend/data/whit.db "select * from webhook_events;"`) to
   confirm it arrived.

If you want stronger verification than a shared header (optional, not
required for the hackathon), RevenueCat also supports HMAC-SHA256 signing —
see their Webhooks docs for the `X-RevenueCat-Webhook-Signature` header.
The current backend code checks the Authorization header, which is simpler
and enough for a submission; swap it for HMAC later if you keep the app
running past the hackathon.

---

## 6. What the app code already does (nothing left to build here)

Just so it's clear what's already wired up vs. what's dashboard config:

- `App.tsx` calls `configurePurchases()` once at launch.
- `lib/auth-context.tsx` calls `Purchases.logIn(userId)` right after
  signup/login, and `Purchases.logOut()` on sign-out — this is what makes
  RevenueCat's `app_user_id` the same as your backend's user id, so the
  webhook's `app_user_id` field tells the backend exactly which account to
  update.
- `screens/PaywallScreen.tsx` loads the current Offering, lets the user pick
  a package, runs `purchasePackage()`, then calls `api.billingSync()` so the
  backend confirms the purchase with RevenueCat's servers before the app
  navigates away — that's the actual moment the archive unlocks.
- `screens/SettingsScreen.tsx` has "Restore purchases", for a user who
  reinstalls or switches devices.
- The backend never trusts the client's local purchase state by itself —
  every gated request (`GET /lessons/:id`, `POST /lessons/:id/complete`)
  checks `users.is_premium` in the database, which only the webhook and
  `/billing/sync` are allowed to write.

---

## 7. Running and testing it

**You cannot test real purchases in Expo Go** — `react-native-purchases` is
a native module. You need a **development build**:

```sh
cd app
npx expo install    # already done once; re-run after editing native deps
eas login           # first time only
eas build:configure # first time only, creates eas.json
eas build --profile development --platform ios     # or --platform android
```

Install the resulting build on a real device or simulator, then:

- **iOS**: create a Sandbox Apple ID in App Store Connect → Users and Access
  → Sandbox testers, sign into it in Settings → App Store → Sandbox Account
  on the test device, then purchase normally in the app — you'll see the
  sandbox purchase sheet ("Environment: Sandbox").
- **Android**: add your Google account as a License Tester in Play Console
  → Setup → License testing, then purchases in the app are free test
  purchases.

Backend has its own test suite that mocks RevenueCat's REST API (no real
account needed to run it):

```sh
cd backend
cp .env.example .env   # fill in JWT_SECRET at minimum to run tests
npm install
npm run seed
npm test
```

---

## 8. Judge access (Shipaton requirement)

The rules require either a free trial or a promo code so judges can unlock
premium without paying. Two ways to satisfy this, pick one:

- **Free trial (already set up in step 2)** — the annual product's 7-day
  free trial means anyone, including judges, can start a trial and see
  every premium feature without being charged. This is the simplest option
  and needs no extra dashboard work.
- **Promo codes** — if you'd rather not rely on a trial, App Store Connect
  and Play Console both support generating a batch of redeemable promo
  codes for a specific subscription; RevenueCat's purchases still get
  attributed normally when a code is redeemed. Generate a handful and
  include one in your Devpost submission.
