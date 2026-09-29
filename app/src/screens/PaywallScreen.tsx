import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { getCurrentOffering, purchase, restore } from '../lib/purchases';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const { refreshUser } = useAuth();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentOffering()
      .then((current) => {
        if (cancelled) return;
        setOffering(current);
        // Prefer the annual package as the pre-selected default, matching
        // the "Best value" highlight in the design.
        const annual = current?.annual ?? current?.availablePackages[0] ?? null;
        setSelected(annual);
      })
      .catch((err) => !cancelled && setError(err.message ?? 'Could not load plans right now.'))
      .finally(() => !cancelled && setLoadingOffering(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function completeUnlock() {
    // Confirms the entitlement with the BACKEND (which itself asks
    // RevenueCat's servers) so server-side gating unlocks immediately,
    // rather than trusting the client SDK's local cache alone.
    await api.billingSync();
    await refreshUser();
    navigation.goBack();
  }

  async function onPurchase() {
    if (!selected) return;
    setError(null);
    setBusy('purchase');
    try {
      await purchase(selected);
      await completeUnlock();
    } catch (err: any) {
      if (!err?.userCancelled) {
        setError(err?.message ?? 'Purchase failed. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function onRestore() {
    setError(null);
    setBusy('restore');
    try {
      await restore();
      await completeUnlock();
    } catch (err: any) {
      setError(err?.message ?? 'Nothing to restore on this account.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={() => navigation.goBack()} style={styles.close} accessibilityLabel="Close">
        <Text style={styles.closeIcon}>{'✕'}</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Unlock every lesson</Text>
        <Text style={styles.subtitle}>
          Full archive access, every category, no limits on how much you learn.
        </Text>

        <View style={styles.benefits}>
          <Benefit text="Unlimited access to the full lesson archive" />
          <Benefit text="Reread anything you've already completed" />
          <Benefit text="New lessons added every day" />
        </View>

        {loadingOffering ? (
          <ActivityIndicator color={colors.cream} style={{ marginTop: 16 }} />
        ) : offering && offering.availablePackages.length > 0 ? (
          <View style={styles.plans}>
            {offering.availablePackages.map((pkg) => (
              <PlanCard
                key={pkg.identifier}
                pkg={pkg}
                selected={selected?.identifier === pkg.identifier}
                onPress={() => setSelected(pkg)}
                highlight={pkg.packageType === 'ANNUAL'}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.noOfferings}>
            Plans aren't available right now — check your RevenueCat offering configuration (see the
            walkthrough doc, step 4).
          </Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flex: 1 }} />

        <PrimaryButton
          title={selected?.packageType === 'ANNUAL' ? 'Start 7-day free trial' : 'Subscribe'}
          variant="light"
          loading={busy === 'purchase'}
          disabled={!selected || busy !== null}
          onPress={onPurchase}
        />
        <Pressable onPress={onRestore} disabled={busy !== null} style={styles.restoreRow}>
          <Text style={styles.restoreText}>
            {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitCheck}>{'✓'}</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function PlanCard({
  pkg,
  selected,
  onPress,
  highlight,
}: {
  pkg: PurchasesPackage;
  selected: boolean;
  onPress: () => void;
  highlight: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.plan, selected && styles.planSelected]}>
      <View>
        <Text style={styles.planTitle}>{pkg.product.title || pkg.identifier}</Text>
        <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
      </View>
      {highlight ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Best value</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  close: { padding: 20, alignItems: 'flex-end' },
  closeIcon: { color: colors.textMuted, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 24, gap: 18 },
  title: { fontSize: 32, fontWeight: '700', color: colors.cream },
  subtitle: { fontSize: 14, color: colors.mauve, lineHeight: 20 },
  benefits: { gap: 12 },
  benefitRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  benefitCheck: { color: colors.teal, fontWeight: '700' },
  benefitText: { color: colors.cream, fontSize: 14, flex: 1 },
  plans: { gap: 10 },
  plan: {
    borderWidth: 1.5,
    borderColor: '#4A3F58',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planSelected: { borderColor: colors.teal, backgroundColor: '#34293F' },
  planTitle: { color: colors.cream, fontSize: 14, fontWeight: '700' },
  planPrice: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  badge: { backgroundColor: colors.teal, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#12241E', fontSize: 11, fontWeight: '700' },
  noOfferings: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { color: '#FF9F80', fontSize: 13 },
  restoreRow: { alignItems: 'center', paddingTop: 4 },
  restoreText: { color: colors.mauve, fontSize: 12, textDecorationLine: 'underline' },
});
