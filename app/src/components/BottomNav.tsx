import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Tab = 'Home' | 'Archive' | 'Settings';

export function BottomNav({ active }: { active: Tab }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const Item = ({ label, tab }: { label: string; tab: Tab }) => {
    const isActive = active === tab;
    return (
      <Pressable
        onPress={() => navigation.navigate(tab)}
        style={styles.item}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[styles.dot, isActive && styles.dotActive]} />
        <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.bar}>
      <Item label="Today" tab="Home" />
      <Item label="Archive" tab="Archive" />
      <Item label="Settings" tab="Settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  item: { alignItems: 'center', gap: 4 },
  dot: { width: 16, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  dotActive: { backgroundColor: colors.ink },
  label: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
  labelActive: { fontWeight: '700', color: colors.ink },
});
