import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { api, ApiError, LessonFull } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

export function LessonScreen({ route, navigation }: Props) {
  const { lessonId } = route.params;
  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .lesson(lessonId)
      .then((l) => !cancelled && setLesson(l))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'PAYMENT_REQUIRED') {
          // Server-enforced paywall: this lesson is locked for this user.
          // Redirect straight to the paywall instead of showing an error.
          navigation.replace('Paywall', { reason: 'archive' });
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Could not load this lesson.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lessonId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={styles.error}>{error ?? 'Lesson not found.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.headerLabel}>{lesson.isToday ? "Today's lesson" : lesson.category}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{lesson.category}</Text>
        </View>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.paragraph}>{lesson.content}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={() => navigation.navigate('Quiz', { lessonId: lesson.id })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, textAlign: 'center', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backArrow: { fontSize: 26, color: colors.ink },
  headerLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  title: { fontSize: 26, fontStyle: 'italic', fontWeight: '700', color: colors.ink, lineHeight: 32 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#3E2E38' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
});
