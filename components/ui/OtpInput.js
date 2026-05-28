import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../styles/designSystem';
import { FONTS } from '../../fonts';

const RT = Colors.rapidTransit;

/**
 * Row of N digit boxes for OTP / TOTP entry.
 *
 * - Each box is 56x56 with `radius=20`.
 * - Empty: slate50 fill, slate200 border.
 * - Filled / focused: white fill, primary border.
 * - Calls onChange(value) with the joined string each keystroke,
 *   and onComplete(value) once all N digits are populated.
 */
export default function OtpInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
}) {
  const inputs = useRef([]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputs.current[0]) {
      const t = setTimeout(() => inputs.current[0]?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const setAt = (idx, ch) => {
    const cleaned = (ch || '').replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    const joined = next.join('').slice(0, length);
    onChange?.(joined);

    if (cleaned && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
    if (joined.length === length) {
      onComplete?.(joined);
    }
  };

  const onKey = (idx) => (e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((d, idx) => (
        <TextInput
          key={idx}
          ref={(el) => {
            inputs.current[idx] = el;
          }}
          value={d}
          onChangeText={(t) => setAt(idx, t)}
          onKeyPress={onKey(idx)}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          style={[styles.box, !!d && styles.boxFilled]}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: RT.slate200,
    backgroundColor: RT.slate50,
    fontFamily: FONTS.Poppins.black,
    fontSize: 22,
    color: RT.slate900,
    textAlign: 'center',
  },
  boxFilled: {
    borderColor: RT.primary,
    backgroundColor: '#FFFFFF',
    color: RT.primary,
  },
});
