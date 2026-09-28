// RevenueCat integration. This is the ONLY file that should import
// react-native-purchases directly — every screen goes through the
// functions exported here, so there's one place that knows about the SDK.
//
// Flow this file implements (see the walkthrough doc for the dashboard
// side of each step):
//   1. configure()     — called once, at app startup, with the PUBLIC SDK key.
//   2. identify()       — called right after signup/login, so RevenueCat's
//                          app_user_id matches our backend's user id. This
//                          is what lets the backend webhook (see
//                          backend/src/routes/billing.js) know which of our
//                          users just subscribed.
//   3. getOfferings()   — fetches the paywall's price/package info to render.
//   4. purchase()        — runs the native purchase sheet for a chosen package.
//   5. restore()         — "Restore purchases" in Settings.
//   6. logOut()          — called on sign-out, resets RevenueCat to an
//                          anonymous user so the next login starts clean.
//
// After purchase() or restore() resolve, the screen calling them should
// also call api.billingSync() (see lib/api.ts) so the BACKEND confirms the
// entitlement with RevenueCat's servers and updates its own database —
// that's what actually unlocks past lessons, not the client-side SDK call
// by itself. See PaywallScreen.tsx for the exact sequence.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { type PurchasesOffering, type PurchasesPackage } from 'react-native-purchases';

const IOS_KEY = Constants.expoConfig?.extra?.revenueCatApiKeyIos as string | undefined;
const ANDROID_KEY = Constants.expoConfig?.extra?.revenueCatApiKeyAndroid as string | undefined;

let configured = false;

export function configurePurchases() {
  if (configured) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

  if (!apiKey || apiKey.includes('xxxx')) {
    console.warn(
      '[purchases] No RevenueCat public SDK key set in app.json > expo.extra. ' +
        'Paywall will not be able to load real offerings until this is set — see the walkthrough doc, step 3.'
    );
    return;
  }

  Purchases.configure({ apiKey });
  configured = true;
}

// Call right after a successful signup/login so RevenueCat's app_user_id
// equals our backend's user id.
export async function identify(userId: string) {
  if (!configured) return;
  await Purchases.logIn(userId);
}

export async function logOut() {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut throws if already anonymous — safe to ignore.
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchase(pkg: PurchasesPackage) {
  if (!configured) throw new Error('Purchases not configured');
  return Purchases.purchasePackage(pkg);
}

export async function restore() {
  if (!configured) throw new Error('Purchases not configured');
  return Purchases.restorePurchases();
}

export async function isEntitledLocally(entitlementId = 'whit_pro'): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.getCustomerInfo();
  return typeof info.entitlements.active[entitlementId] !== 'undefined';
}
