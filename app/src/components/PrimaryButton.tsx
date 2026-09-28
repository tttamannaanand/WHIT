import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, PressableProps } from 'react-native';
import { colors } from '../theme/colors';

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: 'dark' | 'light';
};

export function PrimaryButton({ title, loading, variant = 'dark', style, disabled, ...rest }: Props) {
  const isLight = variant === 'light';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isLight ? styles.light : styles.dark,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isLight ? colors.ink : colors.cream} />
      ) : (
        <Text style={[styles.text, isLight ? styles.textDark : styles.textLight]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dark: { backgroundColor: colors.ink },
  light: { backgroundColor: colors.cream },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { fontSize: 16, fontWeight: '700' },
  textLight: { color: colors.cream },
  textDark: { color: colors.ink },
});
