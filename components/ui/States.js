import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Spacing, scaleFont } from '../../styles/designSystem';
import { FONTS } from '../../fonts';

export function LoadingOverlay({ label = 'Loading\u2026', variant = 'passenger' }) {
  const color = variant === 'conductor' ? Colors.conductor.primary : Colors.rapidTransit.primary;
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={color} />
      <Text style={styles.overlayText}>{label}</Text>
    </View>
  );
}

const STATUS_TONES = {
  success: { bg: Colors.rapidTransit.successSoft, text: Colors.rapidTransit.emerald600 },
  error: { bg: Colors.rapidTransit.errorSoft, text: Colors.rapidTransit.red500 },
  warning: { bg: Colors.rapidTransit.warningSoft, text: Colors.rapidTransit.amber500 },
  info: { bg: Colors.rapidTransit.blue50, text: Colors.rapidTransit.blue600 },
  neutral: { bg: Colors.rapidTransit.slate100, text: Colors.rapidTransit.slate600 },
};

export function StatusBadge({ label, tone = 'neutral', style }) {
  const palette = STATUS_TONES[tone] || STATUS_TONES.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title = 'Nothing here yet', subtitle, variant = 'passenger' }) {
  const RT = Colors.rapidTransit;
  const titleColor = variant === 'conductor' ? RT.white : RT.slate800;
  const subColor = variant === 'conductor' ? 'rgba(255,255,255,0.7)' : RT.slate500;
  return (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyTitle, { color: titleColor }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.emptySub, { color: subColor }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.rapidTransit.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  overlayText: {
    marginTop: 10,
    fontFamily: FONTS.Rubik.medium,
    fontSize: scaleFont(13),
    color: Colors.rapidTransit.slate500,
  },
  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  emptyTitle: { fontFamily: FONTS.Poppins.bold, fontSize: scaleFont(16) },
  emptySub: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: FONTS.Rubik.regular,
    fontSize: scaleFont(13),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONTS.Poppins.bold,
    fontSize: scaleFont(11),
    letterSpacing: 0.2,
  },
});
