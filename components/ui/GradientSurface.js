import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../styles/designSystem';

/**
 * Shared gradient surface used by headers/tab bars/buttons.
 *
 * Variants:
 *   - "passenger" (default): flat RT.primary fill (matches the rapidTransit
 *     login-screen primary button look). No gradient.
 *   - "conductor": uses Colors.conductor.gradient gold/amber gradient.
 *
 * Custom `colors` always wins; pass an explicit array to override.
 */
export default function GradientSurface({
  children,
  style,
  colors,
  variant = 'passenger',
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}) {
  const RT = Colors.rapidTransit;
  let gradientColors = colors;

  if (!gradientColors) {
    gradientColors =
      variant === 'conductor'
        ? Colors.conductor.gradient
        : [RT.primary, RT.primary];
  }

  return (
    <LinearGradient colors={gradientColors} start={start} end={end} style={[styles.container, style]}>
      <View style={styles.contents}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  contents: {
    flex: 0,
  },
});
