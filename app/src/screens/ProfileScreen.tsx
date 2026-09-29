import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../lib/auth-context';
import { api, ApiError } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { user, refreshUser, logOut } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), username: username.trim() });
      await refreshUser();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.avatarInitial ?? 'W'}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput value={user?.email} editable={false} style={[styles.input, styles.inputDisabled]} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" style={styles.input} />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton title="Save changes" loading={saving} onPress={onSave} style={{ marginTop: 8 }} />

        <Pressable style={styles.logout} onPress={logOut}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  backArrow: { fontSize: 26, color: colors.ink },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.ink },
  content: { flex: 1, padding: 24, gap: 20 },
  avatarWrap: { alignItems: 'center', gap: 10 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.mauve, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontStyle: 'italic', fontWeight: '700', color: colors.ink },
  form: { gap: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: { color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13 },
  logout: { marginTop: 'auto', alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
