import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, scaleFont } from '../../styles/designSystem';
import { FONTS } from '../../fonts';

const RT = Colors.rapidTransit;

/**
 * Slate-900 wallet hero card matching the dashboard mock:
 * dark surface, decorative orange blob, balance, top-up tag, QR icon.
 */
export default function WalletHeroCard({
  balance = 0,
  visible = true,
  onToggleVisible,
  onPressTopUp,
  onPressQr,
  label = 'E-Wallet Balance',
  topUpLabel = 'Top Up',
  style,
}) {
  const formatted = visible
    ? `\u20B1${Number(balance || 0).toFixed(2)}`
    : '\u20B1\u2022\u2022\u2022\u2022\u2022\u2022';

  return (
    <View style={[styles.card, style]}>
      <View style={styles.blob} />

      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {!!onToggleVisible && (
          <TouchableOpacity
            onPress={onToggleVisible}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={visible ? 'eye' : 'eye-off'}
              size={18}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.balance} numberOfLines={1}>
        {formatted}
      </Text>

      <View style={styles.footerRow}>
        <TouchableOpacity
          onPress={onPressTopUp}
          activeOpacity={0.85}
          style={styles.topUpTag}
        >
          <Feather name="plus" size={12} color="#FFFFFF" />
          <Text style={styles.topUpText}>{topUpLabel}</Text>
        </TouchableOpacity>

        {!!onPressQr && (
          <TouchableOpacity
            onPress={onPressQr}
            activeOpacity={0.85}
            style={styles.qrChip}
          >
            <Feather name="maximize" size={20} color={RT.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: RT.walletDark,
    borderRadius: 36,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  blob: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: RT.walletAccentBlob,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: FONTS.Poppins.black,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  balance: {
    marginTop: 6,
    marginBottom: 28,
    fontFamily: FONTS.Poppins.black,
    fontSize: scaleFont(30),
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topUpTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  topUpText: {
    fontFamily: FONTS.Poppins.black,
    fontSize: 10,
    letterSpacing: 2,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  qrChip: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
});
