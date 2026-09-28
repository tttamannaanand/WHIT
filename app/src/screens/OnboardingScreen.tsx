import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Whit</Text>
        <Text style={styles.tagline}>A skill a day, five minutes at a time.</Text>
        <Text style={styles.body}>
          One genuinely useful lesson every day — real skills, real facts, nothing you'll forget by
          tomorrow.
        </Text>
        <PrimaryButton
          title="Get started"
          variant="light"
          style={styles.cta}
          onPress={() => navigation.navigate('SignUp')}
        />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 20 },
  title: { fontSize: 40, fontStyle: 'italic', fontWeight: '700', color: colors.cream },
  tagline: { fontSize: 16, color: colors.mauve, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  cta: { width: '100%', marginTop: 12 },
  loginRow: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  loginLink: { color: colors.mauve, fontWeight: '700' },
});
