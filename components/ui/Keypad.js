import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../styles/designSystem';
import { FONTS } from '../../fonts';

const RT = Colors.rapidTransit;

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['empty', '0', 'back'],
];

/**
 * Numeric keypad matching the mock's MPIN screen:
 * 56x56 round slate-50 tiles, slate-100 border, slate-800 number.
 * Backspace tile uses slate-400 icon, switches to red on press.
 */
export default function Keypad({ onPress, onBackspace, disabled = false }) {
  return (
    <View style={styles.grid}>
      {ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((cell) => {
            if (cell === 'empty') {
              return <View key="empty" style={styles.cell} />;
            }
            if (cell === 'back') {
              return (
                <TouchableOpacity
                  key="back"
                  style={[styles.cell, styles.button]}
                  onPress={onBackspace}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Feather name="delete" size={22} color={RT.slate400} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={cell}
                style={[styles.cell, styles.button]}
                onPress={() => onPress(cell)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Text style={styles.label}>{cell}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const SIZE = 64;

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cell: {
    width: SIZE,
    height: SIZE,
    marginHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderRadius: SIZE / 2,
    backgroundColor: RT.slate50,
    borderWidth: 1,
    borderColor: RT.slate100,
  },
  label: {
    fontFamily: FONTS.Poppins.black,
    fontSize: 22,
    color: RT.slate800,
  },
});
