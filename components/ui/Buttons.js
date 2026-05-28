import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Colors, scaleFont } from '../../styles/designSystem';
import { FONTS } from '../../fonts';

/**
 * Solid primary button matching the login screens
 * (PhoneNumberScreen for passenger, ConductorLoginScreen for conductor).
 *
 * variant: "passenger" -> RT.primary on white text
 *          "conductor" -> Colors.conductor.primary on dark text
 */
export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'passenger',
  style,
  icon = null,
}) {
  const RT = Colors.rapidTransit;
  const isConductor = variant === 'conductor';
  const bg = isConductor ? Colors.conductor.primary : RT.primary;
  const labelColor = isConductor ? Colors.rapidTransit.slate900 : Colors.rapidTransit.white;
  const shadowColor = isConductor ? Colors.conductor.primary : RT.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[
        styles.primary,
        {
          backgroundColor: bg,
          shadowColor,
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.primaryRow}>
          <Text style={[styles.primaryText, { color: labelColor }]}>{title}</Text>
          {icon ? <View style={styles.primaryIcon}>{icon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
  variant = 'passenger',
  style,
}) {
  const RT = Colors.rapidTransit;
  const isConductor = variant === 'conductor';
  const borderColor = isConductor ? Colors.conductor.primary : RT.slate200;
  const labelColor = isConductor ? Colors.conductor.primary : RT.slate800;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.secondary,
        { borderColor },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.secondaryText, { color: labelColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Pill({ children, style }) {
  return <View style={[styles.pill, style]}>{children}</View>;
}

export function AmountChip({ label, selected, onPress, style }) {
  const RT = Colors.rapidTransit;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.amountChip,
        {
          backgroundColor: selected ? RT.primarySoft : RT.slate50,
          borderColor: selected ? RT.primary : RT.slate200,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.amountChipText,
          { color: selected ? RT.primaryDark : RT.slate800 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: FONTS.Poppins.black,
    fontSize: scaleFont(16),
    letterSpacing: 0.2,
  },
  primaryIcon: {
    marginLeft: 8,
  },
  secondary: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: Colors.rapidTransit.white,
    borderWidth: 2,
  },
  secondaryText: {
    fontFamily: FONTS.Poppins.bold,
    fontSize: scaleFont(15),
    letterSpacing: 0.2,
  },
  disabled: { opacity: 0.55 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.rapidTransit.slate50,
    borderWidth: 1,
    borderColor: Colors.rapidTransit.slate100,
  },
  amountChip: {
    minWidth: 88,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountChipText: {
    fontFamily: FONTS.Poppins.bold,
    fontSize: scaleFont(14),
  },
});
