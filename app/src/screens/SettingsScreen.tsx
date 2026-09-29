import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../lib/auth-context';
import { restore } from '../lib/purchases';
import { api } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { user, logOut, refreshUser } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  async function onRestore() {
    setRestoring(true);
    setRestoreMessage(null);
    try {
      await restore();
      await api.billingSync();
      await refreshUser();
      setRestoreMessage('Purchases restored.');
    } catch {
      setRestoreMessage('Nothing to restore on this account.');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Settings</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.profileCard} onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.avatarInitial ?? 'W'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <Text style={styles.chevron}>{'›'}</Text>
        </Pressable>

        <View style={styles.statsCard}>
          <View>
            <Text style={styles.statLabel}>Current streak</Text>
            <Text style={styles.statValue}>{user?.currentStreak ?? 0} days</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>Lessons done</Text>
            <Text style={styles.statValue}>{user?.lessonsCompleted ?? 0}</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <Row
            label={user?.isPremium ? 'Manage subscription' : 'Unlock Premium'}
            onPress={() => navigation.navigate('Paywall', { reason: 'manage' })}
          />
          <Row label={restoring ? 'Restoring…' : 'Restore purchases'} onPress={onRestore} last />
        </View>
        {restoreMessage ? <Text style={styles.restoreMessage}>{restoreMessage}</Text> : null}

        <Pressable style={styles.logout} onPress={logOut}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}

function Row({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>{'›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  content: { paddingHorizontal: 20, gap: 16, paddingBottom: 16 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mauve, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontStyle: 'italic', fontWeight: '700', color: colors.ink },
  profileName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  profileEmail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 18 },
  statsCard: {
    backgroundColor: colors.mauve,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.ink, marginTop: 2 },
  listCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  row: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0E8E6' },
  rowLabel: { fontSize: 15, color: colors.ink },
  restoreMessage: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  logout: { alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
