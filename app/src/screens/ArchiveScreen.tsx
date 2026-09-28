import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { BottomNav } from '../components/BottomNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { api, LessonSummary } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Archive'>;

export function ArchiveScreen({ navigation }: Props) {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      api
        .archive()
        .then((res) => !cancelled && setLessons(res.lessons))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  function onPressLesson(item: LessonSummary) {
    if (item.locked) {
      navigation.navigate('Paywall', { reason: 'archive' });
    } else {
      navigation.navigate('Lesson', { lessonId: item.id });
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Archive</Text>
        <Text style={styles.subtitle}>
          Free access is today's lesson only. Unlock Premium to reread anything you've finished and
          browse every past lesson.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {lessons.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => onPressLesson(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.completed && item.locked ? (
                  <Text style={styles.rereadNote}>{'✓'} You read this · unlock to reread</Text>
                ) : (
                  <Text style={styles.readTime}>{item.readTime} read</Text>
                )}
              </View>
              {item.locked ? <Text style={styles.lockIcon}>{'🔒'}</Text> : null}
            </Pressable>
          ))}

          <PrimaryButton
            title="Unlock full access"
            style={{ marginTop: 4 }}
            onPress={() => navigation.navigate('Paywall', { reason: 'archive' })}
          />
        </ScrollView>
      )}

      <BottomNav active="Archive" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 30, fontStyle: 'italic', fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 19 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  readTime: { fontSize: 12, color: colors.textMuted },
  rereadNote: { fontSize: 12, color: colors.textMuted },
  lockIcon: { fontSize: 16 },
});
