import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { PrimaryButton } from '../components/PrimaryButton';
import { BottomNav } from '../components/BottomNav';
import { api, LessonFull } from '../lib/api';
import { useAuth } from '../lib/auth-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      Promise.all([api.today(), refreshUser()])
        .then(([res]) => {
          if (cancelled) return;
          setLesson(res.lesson);
          setDayNumber(res.dayNumber);
          setError(null);
        })
        .catch((err) => !cancelled && setError(err.message ?? 'Could not load today’s lesson'))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>Day {dayNumber}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : lesson ? (
        <View style={styles.content}>
          <Text style={styles.eyebrow}>Today's lesson</Text>
          <Text style={styles.title}>{lesson.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{lesson.category}</Text>
            </View>
            <Text style={styles.readTime}>{lesson.readTime} read</Text>
          </View>

          <PrimaryButton
            title={lesson.completed ? 'Read again' : 'Start reading'}
            style={{ marginTop: 12 }}
            onPress={() => navigation.navigate('Lesson', { lessonId: lesson.id })}
          />

          <View style={styles.streakCard}>
            <View>
              <Text style={styles.streakCardLabel}>Current streak</Text>
              <Text style={styles.streakCardValue}>{user?.currentStreak ?? 0} {(user?.currentStreak ?? 0) === 1 ? 'day' : 'days'}</Text>
            </View>
            <View>
              <Text style={styles.streakCardLabel}>Longest streak</Text>
              <Text style={styles.streakCardValue}>{user?.longestStreak ?? 0} {(user?.longestStreak ?? 0) === 1 ? 'day' : 'days'}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <BottomNav active="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { width: 28, height: 28, borderRadius: 7 },
  streakPill: { backgroundColor: colors.mauve, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  streakText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, textAlign: 'center', paddingHorizontal: 24 },
  content: { flex: 1, padding: 20, gap: 14 },
  eyebrow: { fontSize: 13, fontWeight: '500', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink, lineHeight: 36 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryPill: { backgroundColor: colors.successBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  categoryText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  readTime: { fontSize: 13, color: colors.textMuted },
  streakCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streakCardLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  streakCardValue: { fontSize: 18, fontWeight: '700', color: colors.ink },
});
