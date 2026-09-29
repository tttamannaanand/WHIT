import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in every field to continue.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      // Navigation switches to the signed-in stack automatically (see App.tsx).
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.inner}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
        <Text style={styles.backArrow}>{'‹'}</Text>
      </Pressable>

      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Your streak and saved lessons will sync here.</Text>

      <View style={styles.form}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Jordan Lee" />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="jordan@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton title="Sign up" loading={loading} onPress={onSubmit} style={{ marginTop: 8 }} />

      <Text style={styles.loginRow}>
        Already have an account?{' '}
        <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
          Log in
        </Text>
      </Text>
      </View>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize ?? 'sentences'}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  inner: { flex: 1, padding: 24 },
  back: { marginBottom: 20 },
  backArrow: { fontSize: 28, color: colors.ink },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 24 },
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
  error: { color: colors.danger, fontSize: 13, marginTop: 16 },
  loginRow: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 24 },
  loginLink: { color: colors.ink, fontWeight: '700' },
});
