import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, scaleFont } from '../../styles/designSystem';
import { FONTS } from '../../fonts';

/**
 * Unified app header.
 *
 * Variants:
 *   - "passenger": white surface with slate100 bottom border, Feather back at slate600,
 *     title in Poppins.bold slate800. Mirrors the navHeader row from
 *     screens/VerifyOTPScreen.js so all passenger screens share one chrome.
 *   - "conductor": gold/amber LinearGradient header (Colors.conductor.gradient),
 *     light status bar, white Feather back. Mirrors screens/ConductorLoginScreen.js
 *     gradient shell.
 */
export default function AppHeader({
  title,
  subtitle,
  onBack,
  right,
  variant = 'passenger',
}) {
  const insets = useSafeAreaInsets();
  const RT = Colors.rapidTransit;
  const isConductor = variant === 'conductor';

  const titleColor = isConductor ? '#FFFFFF' : RT.slate800;
  const subColor = isConductor ? 'rgba(255,255,255,0.82)' : RT.slate500;
  const backTint = isConductor ? '#FFFFFF' : RT.slate600;

  const headerPaddingTop = Math.max(insets.top + 8, Spacing.md);
  const statusBarStyle = isConductor ? 'light-content' : 'dark-content';

  const row = (
    <View style={styles.row}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, isConductor && styles.backBtnConductor]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color={backTint} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backSpacer} />
      )}

      <View style={styles.center}>
        {!!title && (
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.right}>{right || <View style={styles.backSpacer} />}</View>
    </View>
  );

  if (isConductor) {
    return (
      <View>
        {Platform.OS === 'android' && (
          <RNStatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />
        )}
        <LinearGradient
          colors={Colors.conductor.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.wrap, { paddingTop: headerPaddingTop }]}
        >
          {row}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        styles.wrapPassenger,
        { paddingTop: headerPaddingTop },
      ]}
    >
      {row}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  wrapPassenger: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.rapidTransit.slate50,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnConductor: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  backSpacer: { width: 40, height: 40 },
  center: { flex: 1, paddingHorizontal: 8, alignItems: 'center' },
  right: { width: 40, alignItems: 'flex-end' },
  title: {
    fontFamily: FONTS.Poppins.bold,
    fontSize: scaleFont(18),
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    fontFamily: FONTS.Rubik.regular,
    fontSize: scaleFont(12),
    textAlign: 'center',
  },
});
