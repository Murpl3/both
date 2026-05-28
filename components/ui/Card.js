import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../styles/designSystem';

const RT = Colors.rapidTransit;

const RADII = {
  default: 24,
  card: RT.cardRadius || 28,
  large: RT.cardRadiusLarge || 48,
};

/**
 * White card matching the rapidTransit auth screens:
 * rounded corners, slate100 border, soft slate900 shadow.
 *
 * Pass radius="large" for the hero card style (48), "card" for the
 * standard inner card (28), or "default" for the legacy 24 radius.
 */
export default function Card({
  children,
  style,
  padded = true,
  elevated = true,
  radius = 'default',
}) {
  const r = RADII[radius] || RADII.default;
  return (
    <View
      style={[
        styles.card,
        { borderRadius: r },
        padded && styles.padded,
        elevated && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: RT.white,
    borderWidth: 1,
    borderColor: RT.slate100,
  },
  padded: { padding: Spacing.lg },
  elevated: {
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
});
