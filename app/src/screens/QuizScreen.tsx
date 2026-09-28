import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { api, LessonFull } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

export function QuizScreen({ route, navigation }: Props) {
  const { lessonId } = route.params;
  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    api.lesson(lessonId).then(setLesson).catch(() => {});
  }, [lessonId]);

  async function onContinue() {
    setCompleting(true);
    try {
      await api.completeLesson(lessonId);
    } catch {
      // Non-fatal for the UI — worst case the streak/xp just doesn't bump
      // this time; the lesson content itself was already shown.
    } finally {
      setCompleting(false);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  }

  if (!lesson) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.badge}>
        <Text style={styles.badgeCheck}>{'✓'}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>Lesson complete</Text>
        <Text style={styles.title}>Quick check</Text>

        <Text style={styles.question}>{lesson.quizQuestion}</Text>

        {revealed ? (
          <View style={styles.answerCard}>
            <Text style={styles.answerLabel}>Answer</Text>
            <Text style={styles.answerText}>{lesson.answer}</Text>
          </View>
        ) : (
          <PrimaryButton title="Show answer" variant="light" onPress={() => setRevealed(true)} />
        )}

        <View style={{ flex: 1 }} />

        <PrimaryButton title="Continue" loading={completing} onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginLeft: 20,
  },
  badgeCheck: { color: '#12241E', fontWeight: '700', fontSize: 18 },
  content: { flex: 1, padding: 20, gap: 18 },
  eyebrow: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 26, fontStyle: 'italic', fontWeight: '700', color: colors.ink, marginTop: -8 },
  question: { fontSize: 16, fontWeight: '700', color: colors.ink, lineHeight: 22 },
  answerCard: {
    backgroundColor: colors.successBg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.teal,
    padding: 16,
  },
  answerLabel: { fontSize: 12, fontWeight: '700', color: colors.success, textTransform: 'uppercase', marginBottom: 6 },
  answerText: { fontSize: 15, color: colors.success, fontWeight: '500', lineHeight: 21 },
});
