import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Spacing, scaleFont } from '../../styles/designSystem';
import { FONTS } from '../../fonts';

const RT = Colors.rapidTransit;

/**
 * Input field matching the login screens' inputRow style:
 * slate50 fill, slate100 border, primary border + primarySoft fill on error.
 *
 * `prefix` renders an inline label divided by a slate200 separator
 * (e.g. the `+63` country code on PhoneNumberScreen).
 */
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'none',
  error,
  right,
  left,
  prefix,
  editable = true,
  variant = 'passenger',
  maxLength,
  multiline = false,
  numberOfLines,
  style,
  inputStyle,
}) {
  const isConductor = variant === 'conductor';
  const accent = isConductor ? Colors.conductor.primary : RT.primary;

  return (
    <View style={[styles.wrap, style]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          !!error && { borderColor: accent, backgroundColor: RT.primarySoft },
          multiline && styles.inputRowMultiline,
        ]}
      >
        {!!prefix && (
          <View style={styles.prefixWrap}>
            <Text style={styles.prefix}>{prefix}</Text>
            <View style={styles.prefixDivider} />
          </View>
        )}
        {!!left && <View style={styles.side}>{left}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={RT.slate300}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          editable={editable}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
        />
        {!!right && <View style={styles.side}>{right}</View>}
      </View>
      {!!error && <Text style={[styles.error, { color: accent }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: {
    fontFamily: FONTS.Poppins.black,
    fontSize: 10,
    color: RT.slate400,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RT.slate50,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: RT.slate100,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputRowMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.Poppins.bold,
    fontSize: scaleFont(15),
    color: RT.slate800,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  side: { marginHorizontal: 6 },
  prefixWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  prefix: {
    fontFamily: FONTS.Poppins.black,
    fontSize: scaleFont(15),
    color: RT.slate900,
  },
  prefixDivider: {
    width: 1,
    height: 22,
    backgroundColor: RT.slate200,
    marginLeft: 12,
  },
  error: {
    marginTop: 6,
    marginLeft: 4,
    fontFamily: FONTS.Rubik.bold,
    fontSize: scaleFont(11),
  },
});
