import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../styles/designSystem';

/**
 * Screen wrapper with consistent rapidTransit background + status bar.
 * variant="conductor" uses a slate background area below the gold header.
 */
export default function Screen({
  children,
  variant = 'passenger',
  padded = false,
  statusBarStyle,
  style,
}) {
  const RT = Colors.rapidTransit;
  const bg = RT.bg;
  const barStyle = statusBarStyle || (variant === 'conductor' ? 'light-content' : 'dark-content');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle={barStyle} />
      <View style={[styles.container, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  padded: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
});
